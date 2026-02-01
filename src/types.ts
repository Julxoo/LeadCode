export interface FrameworkInfo {
  name: string;
  version: string;
  variant?: string; // e.g. "app-router" | "pages-router"
}

export interface StructureInfo {
  hasSrcDir: boolean;
  hasAppDir: boolean;
  hasPagesDir: boolean;
  hasApiRoutes: boolean;
  hasMiddleware: boolean;
  hasPublicDir: boolean;
  hasLibDir: boolean;
  hasUtilsDir: boolean;
  hasServicesDir: boolean;
  hasComponentsDir: boolean;
  hasHooksDir: boolean;
  topLevelDirs: string[];
  // Next.js App Router specific
  hasErrorBoundary: boolean;
  hasLoadingStates: boolean;
  hasNotFound: boolean;
  hasMetadata: boolean;
  // Project infra
  hasPrismaSchema: boolean;
  hasDockerfile: boolean;
  hasEnvExample: boolean;
  hasEnvValidation: boolean;
  hasTsConfig: boolean;
  // Directory patterns
  hasTestsDir: boolean;
  hasSchemasDir: boolean;
  hasActionsDir: boolean;
  hasQueriesDir: boolean;
  hasConfigDir: boolean;
  hasProvidersDir: boolean;
  hasStoreDir: boolean;
  hasTypesDir: boolean;
  // Runtime detection
  detectedRuntime: "node" | "bun" | "deno";
  // Scale indicator
  approximateFileCount: number;
}

export interface DetectedStack {
  orm: string | null;
  auth: string | null;
  validation: string | null;
  css: string | null;
  testing: string | null;
  stateManagement: string | null;
  dataFetching: string | null;
  formLibrary: string | null;
  apiStyle: string | null;
  bundler: string | null;
  linter: string | null;
  formatter: string | null;
  i18n: string | null;
  runtime: string | null;
  monorepo: string | null;
  deployment: string | null;
  database: string | null;
  email: string | null;
  fileUpload: string | null;
  payments: string | null;
  realtime: string | null;
  cms: string | null;
  jobs: string | null;
  uiComponents: string | null;
}

export interface RepoAnalysis {
  projectPath: string;
  projectName: string;
  framework: FrameworkInfo | null;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  structure: StructureInfo;
  detected: DetectedStack;
}
