export interface FrameworkInfo {
  name: string;
  version: string;
  variant?: string; // e.g. "app-router" | "pages-router"
}

export interface RecognizedTech {
  name: string;
  version: string | null;
  category: string;
}

export interface DetectedStack {
  /** Techs identified by heuristics, keyed by canonical name */
  recognized: Record<string, RecognizedTech>;
  /** Dependency names not matched by any heuristic — Claude decides relevance */
  unrecognized: string[];
}

export interface StructureInfo {
  hasSrcDir: boolean;
  topLevelDirs: string[];
  srcDirs: string[];
  detectedRuntime: "node" | "bun" | "deno";
  approximateFileCount: number;
  // Infra (factual filesystem checks)
  hasPrismaSchema: boolean;
  hasDockerfile: boolean;
  hasEnvExample: boolean;
  hasEnvValidation: boolean;
  hasTsConfig: boolean;
  // Next.js App Router specifics (factual)
  hasAppDir: boolean;
  hasPagesDir: boolean;
  hasApiRoutes: boolean;
  hasMiddleware: boolean;
}

export interface FetchedDocs {
  techDocs: Record<string, string>;
  crossDocs: Record<string, string>;
  metadata: {
    techCount: number;
    snippetCount: number;
    failedTechs: string[];
    warning?: string;
  };
}

export interface RepoAnalysis {
  projectPath: string;
  projectName: string;
  framework: FrameworkInfo | null;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  scripts: Record<string, string>;
  engines: Record<string, string>;
  packageManager: string | null;
  workspaces: string[] | null;
  structure: StructureInfo;
  detected: DetectedStack;
}
