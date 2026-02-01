import type { RepoAnalysis } from "../types.js";
import type { CodePatterns } from "../analyzers/patterns.js";
import type { FetchedDocs } from "../types.js";
import type { Locale } from "../i18n/types.js";
import { getMessages, interpolate } from "../i18n/index.js";

function describeArchitecture(analysis: RepoAnalysis, locale: Locale): string[] {
  const m = getMessages(locale).templates;
  const lines: string[] = [];
  const f = analysis.framework;
  const d = analysis.detected;

  if (f?.name === "next") {
    const variant = f.variant === "app-router" ? "App Router" : f.variant === "pages-router" ? "Pages Router" : "";
    lines.push(`- **${m.architecture.frontendBackend}**: Next.js ${f.version} (${variant}) — ${m.architecture.fullStackReact}`);
  } else if (f?.name === "vite-react") {
    lines.push(`- **${m.architecture.frontend}**: ${m.architecture.reactSpaVite} ${f.version}`);
  } else if (f?.name === "react") {
    lines.push(`- **${m.architecture.frontend}**: React ${f.version}`);
  } else if (f) {
    lines.push(`- **${m.architecture.framework}**: ${f.name} ${f.version}`);
  }

  if (d.orm) lines.push(`- **${m.architecture.dataLayer}**: ${d.orm}${d.database ? ` → ${d.database}` : ""}`);
  else if (d.database) lines.push(`- **${m.architecture.database}**: ${d.database}`);

  if (d.auth) lines.push(`- **${m.architecture.authentication}**: ${d.auth}`);
  if (d.apiStyle) lines.push(`- **${m.architecture.api}**: ${d.apiStyle}`);
  if (d.stateManagement) lines.push(`- **${m.architecture.clientState}**: ${d.stateManagement}`);
  if (d.i18n) lines.push(`- **${m.architecture.i18n}**: ${d.i18n}`);
  if (d.payments) lines.push(`- **${m.architecture.payments}**: ${d.payments}`);
  if (d.realtime) lines.push(`- **${m.architecture.realtime}**: ${d.realtime}`);
  if (d.email) lines.push(`- **${m.architecture.email}**: ${d.email}`);
  if (d.cms) lines.push(`- **${m.architecture.content}**: ${d.cms}`);
  if (d.jobs) lines.push(`- **${m.architecture.backgroundJobs}**: ${d.jobs}`);
  if (d.fileUpload) lines.push(`- **${m.architecture.fileUpload}**: ${d.fileUpload}`);

  const scale = analysis.structure.approximateFileCount;
  if (scale > 0) {
    const size = scale < 30 ? m.architecture.sizeSmall
      : scale < 100 ? m.architecture.sizeMedium
      : scale < 300 ? m.architecture.sizeLarge
      : m.architecture.sizeVeryLarge;
    lines.push(`- **${m.architecture.projectSize}**: ${size} (~${scale} ${m.architecture.sourceFiles})`);
  }

  return lines;
}

function buildDynamicInstructions(analysis: RepoAnalysis, locale: Locale): string[] {
  const m = getMessages(locale).templates.instructions;
  const lines: string[] = [];
  const f = analysis.framework;
  const d = analysis.detected;

  lines.push(`- ${m.followAll}`);
  lines.push(`- ${m.respectStructure}`);
  lines.push(`- ${m.checkPrecedent}`);
  lines.push(`- ${m.neverNewDeps}`);
  lines.push(`- ${m.smallChanges}`);

  if (f?.name === "next" && f.variant === "app-router") {
    lines.push(`- ${m.serverComponents}`);
    lines.push(`- ${m.appRouterPages}`);
    lines.push(`- ${m.serverActions}`);
  }

  if (d.orm === "prisma") lines.push(`- ${m.prismaAfterChange}`);
  else if (d.orm === "drizzle") lines.push(`- ${m.drizzleAfterChange}`);

  if (d.validation === "zod") lines.push(`- ${m.zodValidate}`);
  if (d.css === "tailwind") lines.push(`- ${m.tailwindClasses}`);
  if (d.uiComponents === "shadcn") lines.push(`- ${m.shadcnComponents}`);

  if (d.testing) lines.push(`- ${interpolate(m.runTests, { testing: d.testing })}`);
  if (d.linter) lines.push(`- ${interpolate(m.runLinter, { linter: d.linter })}`);
  if (d.i18n) lines.push(`- ${m.i18nStrings}`);

  return lines;
}

/** Format a tech name for display as section header */
function techDisplayName(tech: string): string {
  const names: Record<string, string> = {
    next: "Next.js",
    react: "React",
    "vite-react": "Vite + React",
    nuxt: "Nuxt",
    remix: "Remix",
    astro: "Astro",
    sveltekit: "SvelteKit",
    express: "Express",
    fastify: "Fastify",
    hono: "Hono",
    prisma: "Prisma",
    drizzle: "Drizzle",
    typeorm: "TypeORM",
    mongoose: "Mongoose",
    kysely: "Kysely",
    "next-auth": "NextAuth.js",
    clerk: "Clerk",
    "better-auth": "Better Auth",
    auth0: "Auth0",
    "supabase-auth": "Supabase Auth",
    zod: "Zod",
    valibot: "Valibot",
    tailwind: "Tailwind CSS",
    shadcn: "shadcn/ui",
    chakra: "Chakra UI",
    mui: "Material UI",
    mantine: "Mantine",
    vitest: "Vitest",
    jest: "Jest",
    playwright: "Playwright",
    cypress: "Cypress",
    zustand: "Zustand",
    redux: "Redux Toolkit",
    jotai: "Jotai",
    "react-query": "TanStack Query",
    swr: "SWR",
    "react-hook-form": "React Hook Form",
    trpc: "tRPC",
    stripe: "Stripe",
    resend: "Resend",
    "next-intl": "next-intl",
    i18next: "i18next",
    "socket.io": "Socket.IO",
    inngest: "Inngest",
    sanity: "Sanity",
    contentful: "Contentful",
  };
  return names[tech] ?? tech;
}

export function generateClaudeMd(
  analysis: RepoAnalysis,
  docs: FetchedDocs,
  choices: Record<string, string>,
  patterns?: CodePatterns,
  locale: Locale = "en"
): string {
  const m = getMessages(locale).templates;
  const lines: string[] = [];

  // Header
  lines.push(`# ${interpolate(m.header.title, { name: analysis.projectName })}`);
  lines.push("");
  lines.push(`> ${m.header.meta1}`);
  lines.push(`> ${m.header.meta2}`);
  lines.push("");

  // Architecture overview
  const archLines = describeArchitecture(analysis, locale);
  if (archLines.length > 0) {
    lines.push(`## ${m.sections.architectureOverview}`);
    lines.push("");
    lines.push(...archLines);
    lines.push("");
  }

  // Stack details
  lines.push(`## ${m.sections.stack}`);
  lines.push("");
  if (analysis.framework) {
    const variant = analysis.framework.variant ? ` (${analysis.framework.variant})` : "";
    lines.push(`- **${m.stackLabels.framework}**: ${analysis.framework.name} ${analysis.framework.version}${variant}`);
  }
  const d = analysis.detected;
  if (d.orm) lines.push(`- **${m.stackLabels.orm}**: ${d.orm}`);
  if (d.database) lines.push(`- **${m.stackLabels.database}**: ${d.database}`);
  if (d.auth) lines.push(`- **${m.stackLabels.auth}**: ${d.auth}`);
  if (d.validation) lines.push(`- **${m.stackLabels.validation}**: ${d.validation}`);
  if (d.css) lines.push(`- **${m.stackLabels.css}**: ${d.css}`);
  if (d.uiComponents) lines.push(`- **${m.stackLabels.uiComponents}**: ${d.uiComponents}`);
  if (d.testing) lines.push(`- **${m.stackLabels.testing}**: ${d.testing}`);
  if (d.stateManagement) lines.push(`- **${m.stackLabels.stateManagement}**: ${d.stateManagement}`);
  if (d.dataFetching) lines.push(`- **${m.stackLabels.dataFetching}**: ${d.dataFetching}`);
  if (d.formLibrary) lines.push(`- **${m.stackLabels.formLibrary}**: ${d.formLibrary}`);
  if (d.apiStyle) lines.push(`- **${m.stackLabels.apiStyle}**: ${d.apiStyle}`);
  if (d.i18n) lines.push(`- **${m.stackLabels.i18n}**: ${d.i18n}`);
  if (d.payments) lines.push(`- **${m.stackLabels.payments}**: ${d.payments}`);
  if (d.email) lines.push(`- **${m.stackLabels.email}**: ${d.email}`);
  if (d.realtime) lines.push(`- **${m.stackLabels.realtime}**: ${d.realtime}`);
  if (d.cms) lines.push(`- **${m.stackLabels.cms}**: ${d.cms}`);
  if (d.fileUpload) lines.push(`- **${m.stackLabels.fileUpload}**: ${d.fileUpload}`);
  if (d.jobs) lines.push(`- **${m.stackLabels.jobs}**: ${d.jobs}`);
  if (d.monorepo) lines.push(`- **${m.stackLabels.monorepo}**: ${d.monorepo}`);
  if (d.deployment) lines.push(`- **${m.stackLabels.deployment}**: ${d.deployment}`);
  if (d.linter) lines.push(`- **${m.stackLabels.linter}**: ${d.linter}`);
  if (d.formatter) lines.push(`- **${m.stackLabels.formatter}**: ${d.formatter}`);
  if (d.runtime && d.runtime !== "node") lines.push(`- **${m.stackLabels.runtime}**: ${d.runtime}`);
  lines.push("");

  // Project structure
  lines.push(`## ${m.sections.projectStructure}`);
  lines.push("");
  const s = analysis.structure;
  if (s.hasSrcDir) lines.push(`- ${m.structure.srcDir}`);
  if (s.hasAppDir) lines.push(`- ${m.structure.appRouter}`);
  if (s.hasPagesDir) lines.push(`- ${m.structure.pagesRouter}`);
  if (s.hasApiRoutes) lines.push(`- ${m.structure.apiRoutes}`);
  if (s.hasMiddleware) lines.push(`- ${m.structure.middleware}`);
  if (s.hasComponentsDir) lines.push(`- ${m.structure.components}`);
  if (s.hasLibDir) lines.push(`- ${m.structure.sharedUtils}`);
  if (s.hasServicesDir) lines.push(`- ${m.structure.services}`);
  if (s.hasHooksDir) lines.push(`- ${m.structure.customHooks}`);
  if (s.hasStoreDir) lines.push(`- ${m.structure.stateStores}`);
  if (s.hasSchemasDir) lines.push(`- ${m.structure.validationSchemas}`);
  if (s.hasTypesDir) lines.push(`- ${m.structure.typeDefinitions}`);
  if (s.hasConfigDir) lines.push(`- ${m.structure.configuration}`);
  if (s.hasProvidersDir) lines.push(`- ${m.structure.reactProviders}`);
  if (s.hasPrismaSchema) lines.push(`- ${m.structure.prismaSchema}`);
  lines.push("");

  // Scripts
  const scripts = Object.entries(analysis.scripts);
  if (scripts.length > 0) {
    lines.push(`## ${m.sections.availableScripts}`);
    lines.push("");
    for (const [name, cmd] of scripts) {
      lines.push(`- \`npm run ${name}\` → \`${cmd}\``);
    }
    lines.push("");
  }

  // Per-tech documentation (from Context7)
  const techEntries = Object.entries(docs.techDocs);
  if (techEntries.length > 0) {
    for (const [tech, docContent] of techEntries) {
      if (!docContent.trim()) continue;
      lines.push(`## ${techDisplayName(tech)} Conventions`);
      lines.push("");
      lines.push(docContent.trim());
      lines.push("");
    }
  }

  // Cross-stack conventions (unified section)
  const crossEntries = Object.entries(docs.crossDocs);
  if (crossEntries.length > 0) {
    const crossContent = crossEntries
      .map(([, content]) => content.trim())
      .filter(Boolean)
      .join("\n");
    if (crossContent) {
      lines.push("## Cross-Stack Conventions");
      lines.push("");
      lines.push(crossContent);
      lines.push("");
    }
  }

  // File naming conventions
  lines.push(`## ${m.sections.fileNaming}`);
  lines.push("");
  lines.push(`- ${m.naming.files}`);
  lines.push(`- ${m.naming.reactComponents}`);
  lines.push(`- ${m.naming.hooks}`);
  lines.push(`- ${m.naming.constants}`);
  if (s.hasSrcDir) lines.push(`- ${m.naming.newFilesSrc}`);
  lines.push("");

  // Import ordering
  lines.push(`## ${m.sections.importOrdering}`);
  lines.push("");
  lines.push("```");
  for (const step of m.importOrder) {
    lines.push(step);
  }
  lines.push("```");
  lines.push("");

  // User choices
  const choiceEntries = Object.entries(choices);
  if (choiceEntries.length > 0) {
    lines.push(`## ${m.sections.projectDecisions}`);
    lines.push("");
    for (const [topic, choice] of choiceEntries) {
      lines.push(`- **${topic}**: ${choice}`);
    }
    lines.push("");
  }

  // Existing code patterns
  if (patterns) {
    const patternLines: string[] = [];
    if (patterns.totalComponents > 0) {
      patternLines.push(`- ${interpolate(m.patterns.clientServerRatio, {
        clientCount: patterns.useClientCount,
        totalCount: patterns.totalComponents,
        clientPercent: Math.round(patterns.clientRatio * 100),
      })}`);
    }
    if (patterns.useServerCount > 0) {
      patternLines.push(`- ${interpolate(m.patterns.serverActions, { count: patterns.useServerCount })}`);
    }
    if (patterns.usesPathAlias) patternLines.push(`- ${m.patterns.pathAliases}`);
    if (patterns.hasBarrelFiles) patternLines.push(`- ${m.patterns.barrelFiles}`);
    if (patterns.largeFiles.length > 0) {
      patternLines.push(`- ${interpolate(m.patterns.largeFiles, { count: patterns.largeFiles.length })}`);
    }
    if (patterns.consoleLogCount > 0) {
      patternLines.push(`- ${interpolate(m.patterns.consoleLogs, { count: patterns.consoleLogCount })}`);
    }
    if (patternLines.length > 0) {
      lines.push(`## ${m.sections.existingPatterns}`);
      lines.push("");
      lines.push(...patternLines);
      lines.push("");
    }
  }

  // Dynamic Claude Code instructions
  lines.push(`## ${m.sections.claudeInstructions}`);
  lines.push("");
  const instructions = buildDynamicInstructions(analysis, locale);
  for (const instr of instructions) {
    lines.push(instr);
  }
  lines.push("");

  return lines.join("\n");
}
