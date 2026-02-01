export type Locale = "en" | "fr";

export interface TemplateMessages {
  header: {
    title: string;
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
    dataFetching: string;
    formLibrary: string;
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

export interface Messages {
  templates: TemplateMessages;
}
