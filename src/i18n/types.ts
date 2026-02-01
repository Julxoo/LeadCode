export type Locale = "en" | "fr";

export interface TemplateMessages {
  header: {
    title: string;
    meta1: string;
    meta2: string;
  };
  sections: {
    architectureOverview: string;
    projectDecisions: string;
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
