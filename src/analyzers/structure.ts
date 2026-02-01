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

async function getTopLevelDirs(projectPath: string): Promise<string[]> {
  const entries = await readdir(projectPath, { withFileTypes: true });
  return entries
    .filter(
      (e) =>
        e.isDirectory() && !IGNORE.has(e.name) && !e.name.startsWith(".")
    )
    .map((e) => e.name);
}

/**
 * Recursively search for files matching given names within a directory.
 * Returns true as soon as any match is found (early exit).
 */
async function hasFileRecursive(
  dir: string,
  fileNames: string[],
  maxDepth = 5
): Promise<boolean> {
  if (maxDepth <= 0) return false;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE.has(entry.name) || entry.name.startsWith(".")) continue;
      if (entry.isFile() && fileNames.includes(entry.name)) return true;
      if (entry.isDirectory()) {
        const found = await hasFileRecursive(
          join(dir, entry.name),
          fileNames,
          maxDepth - 1
        );
        if (found) return true;
      }
    }
  } catch {
    // Permission errors, etc.
  }
  return false;
}

/**
 * Search for a string pattern in files within a directory.
 * Returns true if any file contains the pattern.
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
          } catch {
            // Skip unreadable files
          }
        }
      }
      if (entry.isDirectory()) {
        const found = await hasContentRecursive(
          join(dir, entry.name),
          pattern,
          extensions,
          maxDepth - 1
        );
        if (found) return true;
      }
    }
  } catch {
    // Permission errors
  }
  return false;
}

/**
 * Count source files recursively (ts, tsx, js, jsx).
 */
async function countSourceFiles(
  dir: string,
  maxDepth = 6
): Promise<number> {
  if (maxDepth <= 0) return 0;
  let count = 0;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE.has(entry.name) || entry.name.startsWith(".")) continue;
      if (entry.isFile()) {
        const ext = entry.name.split(".").pop() ?? "";
        if (["ts", "tsx", "js", "jsx"].includes(ext)) count++;
      }
      if (entry.isDirectory()) {
        count += await countSourceFiles(join(dir, entry.name), maxDepth - 1);
      }
    }
  } catch {
    // Permission errors
  }
  return count;
}

function anyDirExists(
  topLevelDirs: string[],
  names: string[]
): boolean {
  return names.some((n) => topLevelDirs.includes(n));
}

export async function analyzeStructure(
  projectPath: string
): Promise<StructureInfo> {
  const topLevelDirs = await getTopLevelDirs(projectPath);

  const resolve = (segments: string[]): string =>
    join(projectPath, ...segments);

  const hasSrcDir = await exists(join(projectPath, "src"));
  const prefix = hasSrcDir ? ["src"] : [];

  // Resolve with and without src/
  const checkPath = async (segments: string[]): Promise<boolean> =>
    (await exists(resolve([...prefix, ...segments]))) ||
    (await exists(resolve(segments)));

  // Parallel basic checks
  const [hasAppDir, hasPagesDir, hasMiddleware] = await Promise.all([
    checkPath(["app"]),
    checkPath(["pages"]),
    Promise.all([
      exists(join(projectPath, "middleware.ts")),
      exists(join(projectPath, "middleware.js")),
      exists(join(projectPath, "src", "middleware.ts")),
      exists(join(projectPath, "src", "middleware.js")),
    ]).then((r) => r.some(Boolean)),
  ]);

  const hasApiRoutes =
    (await checkPath(["app", "api"])) || (await checkPath(["pages", "api"]));

  // App Router specific file detection (parallel)
  const appDir = hasSrcDir
    ? join(projectPath, "src", "app")
    : join(projectPath, "app");

  const [hasErrorBoundary, hasLoadingStates, hasNotFound, hasMetadata] = hasAppDir
    ? await Promise.all([
        hasFileRecursive(appDir, ["error.tsx", "error.ts", "error.js", "error.jsx"]),
        hasFileRecursive(appDir, ["loading.tsx", "loading.ts", "loading.js", "loading.jsx"]),
        hasFileRecursive(appDir, ["not-found.tsx", "not-found.ts", "not-found.js", "not-found.jsx"]),
        hasContentRecursive(
          appDir,
          /export\s+(const\s+metadata|async\s+function\s+generateMetadata|function\s+generateMetadata)/,
          ["ts", "tsx", "js", "jsx"]
        ),
      ])
    : [false, false, false, false];

  // Parallel infra + directory checks
  const [
    hasPublicDir, hasLibDir, hasUtilsDir, hasServicesDir, hasComponentsDir, hasHooksDir,
    hasPrismaSchema, hasTsConfig, hasEnvExample, hasEnvValidation,
    hasDockerfile, hasRuntime, approximateFileCount,
  ] = await Promise.all([
    exists(join(projectPath, "public")),
    checkPath(["lib"]),
    checkPath(["utils"]),
    checkPath(["services"]),
    checkPath(["components"]),
    checkPath(["hooks"]),
    exists(join(projectPath, "prisma", "schema.prisma")),
    exists(join(projectPath, "tsconfig.json")),
    Promise.all([
      exists(join(projectPath, ".env.example")),
      exists(join(projectPath, ".env.local.example")),
    ]).then((r) => r.some(Boolean)),
    Promise.all([
      exists(join(projectPath, "env.ts")),
      exists(join(projectPath, "env.mjs")),
      exists(join(projectPath, "src", "env.ts")),
      exists(join(projectPath, "src", "env.mjs")),
      exists(join(projectPath, "lib", "env.ts")),
      exists(join(projectPath, "src", "lib", "env.ts")),
    ]).then((r) => r.some(Boolean)),
    Promise.all([
      exists(join(projectPath, "Dockerfile")),
      exists(join(projectPath, "docker-compose.yml")),
      exists(join(projectPath, "docker-compose.yaml")),
    ]).then((r) => r.some(Boolean)),
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

  // All directory checks
  const allDirs = hasSrcDir
    ? [...topLevelDirs, ...(await getTopLevelDirs(join(projectPath, "src")).catch(() => []))]
    : topLevelDirs;

  return {
    hasSrcDir,
    hasAppDir,
    hasPagesDir,
    hasApiRoutes,
    hasMiddleware,
    hasPublicDir,
    hasLibDir,
    hasUtilsDir,
    hasServicesDir,
    hasComponentsDir,
    hasHooksDir,
    topLevelDirs,
    hasErrorBoundary,
    hasLoadingStates,
    hasNotFound,
    hasMetadata,
    hasPrismaSchema,
    hasDockerfile,
    hasEnvExample,
    hasEnvValidation,
    hasTsConfig,
    hasTestsDir: anyDirExists(allDirs, ["__tests__", "tests", "test", "e2e"]),
    hasSchemasDir: anyDirExists(allDirs, ["schemas", "validators", "validations"]),
    hasActionsDir: anyDirExists(allDirs, ["actions"]),
    hasQueriesDir: anyDirExists(allDirs, ["queries", "data"]),
    hasConfigDir: anyDirExists(allDirs, ["config", "constants"]),
    hasProvidersDir: anyDirExists(allDirs, ["providers", "context"]),
    hasStoreDir: anyDirExists(allDirs, ["store", "stores"]),
    hasTypesDir: anyDirExists(allDirs, ["types"]),
    detectedRuntime: hasRuntime,
    approximateFileCount,
  };
}
