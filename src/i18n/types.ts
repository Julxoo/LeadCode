export type Locale = "en" | "fr";

export interface SuggestionMessages {
  testing: {
    topic: string;
    simple: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
    clean: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
    scalable: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
  };
  inputValidation: {
    topic: string;
    simple: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
    clean: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
  };
  errorHandling: {
    topic: string;
    simple: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
    clean: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
  };
  schemaOrg: {
    topic: string;
    simple: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
    clean: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
  };
  componentStructure: {
    topic: string;
    simple: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
    clean: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
  };
  authMiddleware: {
    topic: string;
    simple: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
    clean: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
  };
  loadingStates: {
    topic: string;
    simple: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
    clean: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
  };
  metadata: {
    topic: string;
    simple: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
    clean: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
  };
  prismaClient: {
    topic: string;
    simple: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
  };
  authSession: {
    topic: string;
    simple: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
    clean: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
  };
  envValidation: {
    topic: string;
    simple: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
    clean: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
  };
  typesDir: {
    topic: string;
    simple: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
  };
  storeOrg: {
    topic: string;
    simple: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
  };
  drizzleSchema: {
    topic: string;
    simple: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
    clean: { description: string; pros: string[]; cons: string[]; claudeImpact: string };
  };
  genericFix: string;
  genericPros: string[];
  genericCons: string[];
  genericClaudeImpact: string;
}

export interface TemplateMessages {
  header: {
    title: string; // "{name} — Project Rules"
    meta1: string;
    meta2: string;
  };
  sections: {
    architectureOverview: string;
    stack: string;
    projectStructure: string;
    availableScripts: string;
    fileNaming: string;
    importOrdering: string;
    conventions: string;
    crossStackRules: string;
    interdictions: string;
    projectDecisions: string;
    existingPatterns: string;
    claudeInstructions: string;
  };
  architecture: {
    frontendBackend: string;
    fullStackReact: string;
    frontend: string;
    reactSpaVite: string;
    framework: string;
    dataLayer: string;
    database: string;
    authentication: string;
    api: string;
    clientState: string;
    i18n: string;
    payments: string;
    realtime: string;
    email: string;
    content: string;
    backgroundJobs: string;
    fileUpload: string;
    projectSize: string;
    sizeSmall: string;
    sizeMedium: string;
    sizeLarge: string;
    sizeVeryLarge: string;
    sourceFiles: string;
  };
  stackLabels: {
    framework: string;
    orm: string;
    database: string;
    auth: string;
    validation: string;
    css: string;
    uiComponents: string;
    testing: string;
    stateManagement: string;
    apiStyle: string;
    i18n: string;
    payments: string;
    email: string;
    realtime: string;
    cms: string;
    fileUpload: string;
    jobs: string;
    monorepo: string;
    deployment: string;
    linter: string;
    formatter: string;
    runtime: string;
  };
  structure: {
    srcDir: string;
    appRouter: string;
    pagesRouter: string;
    apiRoutes: string;
    middleware: string;
    components: string;
    sharedUtils: string;
    services: string;
    customHooks: string;
    stateStores: string;
    validationSchemas: string;
    typeDefinitions: string;
    configuration: string;
    reactProviders: string;
    prismaSchema: string;
  };
  naming: {
    files: string;
    reactComponents: string;
    hooks: string;
    constants: string;
    newFilesSrc: string;
  };
  importOrder: string[];
  instructions: {
    followAll: string;
    respectStructure: string;
    checkPrecedent: string;
    neverNewDeps: string;
    smallChanges: string;
    serverComponents: string;
    appRouterPages: string;
    serverActions: string;
    prismaAfterChange: string;
    drizzleAfterChange: string;
    zodValidate: string;
    tailwindClasses: string;
    shadcnComponents: string;
    runTests: string;
    runLinter: string;
    i18nStrings: string;
  };
  patterns: {
    clientServerRatio: string;
    serverActions: string;
    pathAliases: string;
    barrelFiles: string;
    largeFiles: string;
    consoleLogs: string;
  };
}

export interface ValidationMessages {
  noClaudeMd: string;
  frameworkVersionOutdated: string;
  techMissing: string;
  conventionMissing: string;
  crossStackMissing: string;
  gapStillExists: string;
  inSync: string;
  driftsFound: string;
}

export interface ToolMessages {
  generateSuccess: string;
  updateSuccess: string;
  dirNotFound: string;
}

export interface PromptMessages {
  setupTitle: string;
  setupSteps: string[];
  validateTitle: string;
  validateSteps: string[];
}

export interface Messages {
  templates: TemplateMessages;
  suggestions: SuggestionMessages;
  validation: ValidationMessages;
  tools: ToolMessages;
  prompts: PromptMessages;
}
