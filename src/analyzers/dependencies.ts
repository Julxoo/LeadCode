import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface PackageJsonData {
  name: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

export async function analyzeDependencies(
  projectPath: string
): Promise<PackageJsonData> {
  const raw = await readFile(join(projectPath, "package.json"), "utf-8");
  const pkg = JSON.parse(raw);

  return {
    name: pkg.name ?? "unknown",
    dependencies: pkg.dependencies ?? {},
    devDependencies: pkg.devDependencies ?? {},
    scripts: pkg.scripts ?? {},
  };
}
