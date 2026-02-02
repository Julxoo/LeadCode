import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { StructureInfo } from "../types.js";
import type { Ecosystem } from "./ecosystem.js";
import { IGNORE_DIRS as IGNORE, getIgnoreDirs, getSourceExtensions } from "./constants.js";

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function getSubdirs(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && !IGNORE.has(e.name) && !e.name.startsWith("."))
      .map(e => e.name);
  } catch {
    return [];
  }
}

/**
 * Search for a string pattern in files within a directory.
 */
async function hasContentRecursive(
  dir: string,
  pattern: RegExp,
  extensions: string[],
  maxDepth = 4
): Promise<boolean> {
  if (maxDepth <= 0) return false;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE.has(entry.name) || entry.name.startsWith(".")) continue;
      if (entry.isFile()) {
        const ext = entry.name.split(".").pop() ?? "";
        if (extensions.includes(ext)) {
          try {
            const content = await readFile(join(dir, entry.name), "utf-8");
            if (pattern.test(content)) return true;
          } catch { /* skip unreadable */ }
        }
      }
      if (entry.isDirectory()) {
        const found = await hasContentRecursive(join(dir, entry.name), pattern, extensions, maxDepth - 1);
        if (found) return true;
      }
    }
  } catch { /* permission errors */ }
  return false;
}

/**
 * Count source files recursively, using the provided set of extensions.
 */
async function countSourceFiles(
  dir: string,
  sourceExts: Set<string>,
  ignoreDirs: Set<string>,
  maxDepth = 6,
): Promise<number> {
  if (maxDepth <= 0) return 0;
  let count = 0;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (ignoreDirs.has(entry.name) || IGNORE.has(entry.name) || entry.name.startsWith(".")) continue;
      if (entry.isFile()) {
        const ext = entry.name.split(".").pop() ?? "";
        if (sourceExts.has(ext)) count++;
      }
      if (entry.isDirectory()) {
        count += await countSourceFiles(join(dir, entry.name), sourceExts, ignoreDirs, maxDepth - 1);
      }
    }
  } catch { /* permission errors */ }
  return count;
}

/**
 * Detect runtime. For JS: bun/deno/node. For others: the ecosystem name.
 */
async function detectRuntime(projectPath: string, ecosystem?: Ecosystem): Promise<string> {
  if (!ecosystem || ecosystem === "javascript") {
    const [bunLockb, bunLock, denoJson, denoJsonc] = await Promise.all([
      exists(join(projectPath, "bun.lockb")),
      exists(join(projectPath, "bun.lock")),
      exists(join(projectPath, "deno.json")),
      exists(join(projectPath, "deno.jsonc")),
    ]);
    if (bunLockb || bunLock) return "bun";
    if (denoJson || denoJsonc) return "deno";
    return "node";
  }

  // Map ecosystems to their runtime display name
  const runtimeNames: Record<string, string> = {
    python: "python",
    rust: "rust",
    go: "go",
    java: "jvm",
    php: "php",
    ruby: "ruby",
  };
  return runtimeNames[ecosystem] ?? ecosystem;
}

export async function analyzeStructure(
  projectPath: string,
  ecosystem?: Ecosystem,
): Promise<StructureInfo> {
  const topLevelDirs = await getSubdirs(projectPath);
  const hasSrcDir = topLevelDirs.includes("src");
  const srcDirs = hasSrcDir ? await getSubdirs(join(projectPath, "src")) : [];

  const resolve = (segments: string[]): string => join(projectPath, ...segments);
  const prefix = hasSrcDir ? ["src"] : [];

  const checkPath = async (segments: string[]): Promise<boolean> =>
    (await exists(resolve([...prefix, ...segments]))) ||
    (await exists(resolve(segments)));

  // Parallel checks
  const [hasAppDir, hasPagesDir, hasMiddleware] = await Promise.all([
    checkPath(["app"]),
    checkPath(["pages"]),
    Promise.all([
      exists(join(projectPath, "middleware.ts")),
      exists(join(projectPath, "middleware.js")),
      exists(join(projectPath, "src", "middleware.ts")),
      exists(join(projectPath, "src", "middleware.js")),
      // PHP middleware detection
      exists(join(projectPath, "app", "Http", "Middleware")),
      exists(join(projectPath, "src", "Middleware")),
    ]).then(r => r.some(Boolean)),
  ]);

  const hasApiRoutes =
    (await checkPath(["app", "api"])) ||
    (await checkPath(["pages", "api"])) ||
    // PHP: routes/api.php (Laravel) or config/routes (Symfony)
    (await exists(join(projectPath, "routes", "api.php"))) ||
    (await exists(join(projectPath, "config", "routes")));

  // Schema files
  const schemaFiles: string[] = [];
  if (await exists(join(projectPath, "prisma", "schema.prisma"))) {
    schemaFiles.push("prisma/schema.prisma");
  }
  // Doctrine schema (Symfony/PHP)
  if (await exists(join(projectPath, "config", "packages", "doctrine.yaml"))) {
    schemaFiles.push("config/packages/doctrine.yaml");
  }
  // Laravel migrations directory
  if (await exists(join(projectPath, "database", "migrations"))) {
    schemaFiles.push("database/migrations/");
  }

  // Get ecosystem-aware source extensions and ignore dirs
  const sourceExts = ecosystem ? getSourceExtensions(ecosystem) : new Set([
    "ts", "tsx", "js", "jsx", "mts", "mjs", "cjs", "svelte", "vue", "astro",
  ]);
  const ignoreDirs = ecosystem ? getIgnoreDirs(ecosystem) : IGNORE;

  const [
    hasTsConfig, hasEnvExample, hasEnvValidation,
    hasDockerfile, runtime, approximateFileCount,
  ] = await Promise.all([
    exists(join(projectPath, "tsconfig.json")),
    Promise.all([
      exists(join(projectPath, ".env.example")),
      exists(join(projectPath, ".env.local.example")),
    ]).then(r => r.some(Boolean)),
    Promise.all([
      exists(join(projectPath, "env.ts")),
      exists(join(projectPath, "env.mjs")),
      exists(join(projectPath, "src", "env.ts")),
      exists(join(projectPath, "src", "env.mjs")),
      exists(join(projectPath, "lib", "env.ts")),
      exists(join(projectPath, "src", "lib", "env.ts")),
    ]).then(r => r.some(Boolean)),
    Promise.all([
      exists(join(projectPath, "Dockerfile")),
      exists(join(projectPath, "docker-compose.yml")),
      exists(join(projectPath, "docker-compose.yaml")),
    ]).then(r => r.some(Boolean)),
    detectRuntime(projectPath, ecosystem),
    countSourceFiles(projectPath, sourceExts, ignoreDirs),
  ]);

  return {
    hasSrcDir,
    topLevelDirs,
    srcDirs,
    detectedRuntime: runtime,
    approximateFileCount,
    hasPrismaSchema: schemaFiles.includes("prisma/schema.prisma"),
    hasDockerfile,
    hasEnvExample,
    hasEnvValidation,
    hasTsConfig,
    hasAppDir,
    hasPagesDir,
    hasApiRoutes,
    hasMiddleware,
    schemaFiles,
  };
}
