import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { FrameworkInfo, DetectedStack, StructureInfo } from "../types.js";
import { JavaScriptAdapter } from "./ecosystems/javascript.js";
import { PythonAdapter } from "./ecosystems/python.js";
import { RustAdapter } from "./ecosystems/rust.js";
import { GoAdapter } from "./ecosystems/go.js";
import { JavaAdapter } from "./ecosystems/java.js";
import { PhpAdapter } from "./ecosystems/php.js";

// ---------------------------------------------------------------------------
// Ecosystem type
// ---------------------------------------------------------------------------

export type Ecosystem =
  | "javascript"
  | "python"
  | "rust"
  | "go"
  | "java"
  | "php"
  | "ruby";

// ---------------------------------------------------------------------------
// Generic types
// ---------------------------------------------------------------------------

export interface ManifestFile {
  path: string;
  type: string;
  ecosystem: Ecosystem;
}

export interface EcosystemFilePatterns {
  sourceExtensions: Set<string>;
  ignoreDirs: Set<string>;
  manifestFiles: string[];
}

export interface EcosystemDetection {
  ecosystem: Ecosystem;
  confidence: "high" | "medium" | "low";
  manifestFiles: ManifestFile[];
  reason: string;
}

// ---------------------------------------------------------------------------
// Adapter interface — implemented per ecosystem (Phase 2+)
// ---------------------------------------------------------------------------

export interface EcosystemAdapter {
  ecosystem: Ecosystem;

  getFilePatterns(): EcosystemFilePatterns;

  parseDependencies(projectPath: string): Promise<{
    projectName: string;
    projectVersion: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    peerDependencies: Record<string, string>;
    scripts: Record<string, string>;
    engines: Record<string, string>;
    packageManager: string | null;
    workspaces: string[] | null;
  }>;

  detectFramework(
    deps: Record<string, string>,
    devDeps: Record<string, string>,
    structure: StructureInfo,
  ): FrameworkInfo | null;

  detectStack(
    deps: Record<string, string>,
    devDeps: Record<string, string>,
    structure?: StructureInfo,
  ): DetectedStack;
}

// ---------------------------------------------------------------------------
// Manifest check definitions (ordered by priority)
// ---------------------------------------------------------------------------

interface ManifestCheck {
  files: string[];
  ecosystem: Ecosystem;
  confidence: "high" | "medium" | "low";
  glob?: boolean;
}

const MANIFEST_CHECKS: ManifestCheck[] = [
  { files: ["package.json"], ecosystem: "javascript", confidence: "high" },
  { files: ["pyproject.toml"], ecosystem: "python", confidence: "high" },
  { files: ["requirements.txt", "setup.py", "Pipfile"], ecosystem: "python", confidence: "medium" },
  { files: ["Cargo.toml"], ecosystem: "rust", confidence: "high" },
  { files: ["go.mod"], ecosystem: "go", confidence: "high" },
  { files: ["pom.xml", "build.gradle", "build.gradle.kts"], ecosystem: "java", confidence: "high" },
  { files: ["composer.json"], ecosystem: "php", confidence: "high" },
  { files: ["Gemfile"], ecosystem: "ruby", confidence: "high" },
  { files: ["*.gemspec"], ecosystem: "ruby", confidence: "medium", glob: true },
];

// ---------------------------------------------------------------------------
// Detection functions
// ---------------------------------------------------------------------------

export async function detectEcosystem(
  projectPath: string,
): Promise<EcosystemDetection> {
  for (const check of MANIFEST_CHECKS) {
    for (const file of check.files) {
      try {
        if (check.glob && file.includes("*")) {
          const entries = await readdir(projectPath);
          const pattern = file.replace(".", "\\.").replace("*", ".*");
          const regex = new RegExp(`^${pattern}$`);
          const matches = entries.filter((e) => regex.test(e));

          if (matches.length > 0) {
            return {
              ecosystem: check.ecosystem,
              confidence: check.confidence,
              manifestFiles: matches.map((m) => ({
                path: m,
                type: m,
                ecosystem: check.ecosystem,
              })),
              reason: `Found ${matches.join(", ")}`,
            };
          }
        } else {
          await stat(join(projectPath, file));
          return {
            ecosystem: check.ecosystem,
            confidence: check.confidence,
            manifestFiles: [{ path: file, type: file, ecosystem: check.ecosystem }],
            reason: `Found ${file}`,
          };
        }
      } catch {
        // file not found — continue
      }
    }
  }

  throw new Error(
    `Could not detect project ecosystem in ${projectPath}. ` +
      `No recognized manifest files found (package.json, Cargo.toml, pyproject.toml, go.mod, pom.xml, composer.json, Gemfile).`,
  );
}

export function getEcosystemAdapter(ecosystem: Ecosystem): EcosystemAdapter {
  switch (ecosystem) {
    case "javascript":
      return new JavaScriptAdapter();
    case "python":
      return new PythonAdapter();
    case "rust":
      return new RustAdapter();
    case "go":
      return new GoAdapter();
    case "java":
      return new JavaAdapter();
    case "php":
      return new PhpAdapter();
    default:
      throw new Error(
        `Ecosystem "${ecosystem}" is not yet supported. Currently supported: javascript, python, rust, go, java, php`,
      );
  }
}
