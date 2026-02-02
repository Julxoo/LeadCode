import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { StructureInfo } from "../types.js";
import { IGNORE_DIRS as IGNORE } from "./constants.js";

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
 * Count source files recursively.
 */
async function countSourceFiles(dir: string, maxDepth = 6): Promise<number> {
  if (maxDepth <= 0) return 0;
  let count = 0;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE.has(entry.name) || entry.name.startsWith(".")) continue;
      if (entry.isFile()) {
        const ext = entry.name.split(".").pop() ?? "";
        if (["ts", "tsx", "js", "jsx", "mts", "mjs", "cjs", "svelte", "vue", "astro"].includes(ext)) count++;
      }
      if (entry.isDirectory()) {
        count += await countSourceFiles(join(dir, entry.name), maxDepth - 1);
      }
    }
  } catch { /* permission errors */ }
  return count;
}

export async function analyzeStructure(projectPath: string): Promise<StructureInfo> {
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
    ]).then(r => r.some(Boolean)),
  ]);

  const hasApiRoutes =
    (await checkPath(["app", "api"])) || (await checkPath(["pages", "api"]));

  const [
    hasPrismaSchema, hasTsConfig, hasEnvExample, hasEnvValidation,
    hasDockerfile, runtime, approximateFileCount,
  ] = await Promise.all([
    exists(join(projectPath, "prisma", "schema.prisma")),
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
    Promise.all([
      exists(join(projectPath, "bun.lockb")),
      exists(join(projectPath, "bun.lock")),
      exists(join(projectPath, "deno.json")),
      exists(join(projectPath, "deno.jsonc")),
    ]).then(([bunLockb, bunLock, denoJson, denoJsonc]) =>
      (bunLockb || bunLock) ? "bun" as const : (denoJson || denoJsonc) ? "deno" as const : "node" as const
    ),
    countSourceFiles(projectPath),
  ]);

  return {
    hasSrcDir,
    topLevelDirs,
    srcDirs,
    detectedRuntime: runtime,
    approximateFileCount,
    hasPrismaSchema,
    hasDockerfile,
    hasEnvExample,
    hasEnvValidation,
    hasTsConfig,
    hasAppDir,
    hasPagesDir,
    hasApiRoutes,
    hasMiddleware,
  };
}
