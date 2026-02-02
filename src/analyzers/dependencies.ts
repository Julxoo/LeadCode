import { getEcosystemAdapter } from "./ecosystem.js";

// Re-export type for backward compatibility
export type { PackageJsonData } from "./ecosystems/javascript.js";

export async function analyzeDependencies(
  projectPath: string,
): Promise<{
  name: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  scripts: Record<string, string>;
  engines: Record<string, string>;
  packageManager: string | null;
  workspaces: string[] | null;
}> {
  const adapter = getEcosystemAdapter("javascript");
  const result = await adapter.parseDependencies(projectPath);
  return {
    name: result.projectName,
    version: result.projectVersion,
    dependencies: result.dependencies,
    devDependencies: result.devDependencies,
    peerDependencies: result.peerDependencies,
    scripts: result.scripts,
    engines: result.engines,
    packageManager: result.packageManager,
    workspaces: result.workspaces,
  };
}
