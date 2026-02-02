import type { DetectedStack, FrameworkInfo, StructureInfo } from "../types.js";
import { getEcosystemAdapter } from "./ecosystem.js";

type Deps = Record<string, string>;

const adapter = getEcosystemAdapter("javascript");

export function detectFramework(
  deps: Deps,
  devDeps: Deps,
  structure: StructureInfo,
): FrameworkInfo | null {
  return adapter.detectFramework(deps, devDeps, structure);
}

export function detectStack(
  deps: Deps,
  devDeps: Deps,
  structure?: StructureInfo,
): DetectedStack {
  return adapter.detectStack(deps, devDeps, structure);
}
