import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface PackageJsonData {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  scripts: Record<string, string>;
  engines: Record<string, string>;
  packageManager: string | null;
  workspaces: string[] | null;
}

export async function analyzeDependencies(
  projectPath: string
): Promise<PackageJsonData> {
  const filePath = join(projectPath, "package.json");
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    throw new Error(`Cannot read package.json at ${filePath}`);
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in ${filePath}`);
  }

  // workspaces can be string[] or { packages: string[] }
  let workspaces: string[] | null = null;
  if (Array.isArray(pkg.workspaces)) {
    workspaces = pkg.workspaces as string[];
  } else if (pkg.workspaces && typeof pkg.workspaces === "object") {
    const w = pkg.workspaces as Record<string, unknown>;
    if (Array.isArray(w.packages)) workspaces = w.packages as string[];
  }

  return {
    name: typeof pkg.name === "string" ? pkg.name : "unknown",
    version: typeof pkg.version === "string" ? pkg.version : "0.0.0",
    dependencies: (pkg.dependencies as Record<string, string>) ?? {},
    devDependencies: (pkg.devDependencies as Record<string, string>) ?? {},
    peerDependencies: (pkg.peerDependencies as Record<string, string>) ?? {},
    scripts: (pkg.scripts as Record<string, string>) ?? {},
    engines: (pkg.engines as Record<string, string>) ?? {},
    packageManager: typeof pkg.packageManager === "string" ? pkg.packageManager : null,
    workspaces,
  };
}
