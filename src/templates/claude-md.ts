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
  const d = analysis.detected;
  const s = analysis.structure;

  // Header
  lines.push(`# ${interpolate(m.header.title, { name: analysis.projectName })}`);
  lines.push("");
  lines.push(`> ${m.header.meta1}`);
  lines.push(`> ${m.header.meta2}`);
  lines.push("");

  // Project overview: architecture + stack + structure in one section
  lines.push(`## ${m.sections.architectureOverview}`);
  lines.push("");
  const archLines = describeArchitecture(analysis, locale);
  lines.push(...archLines);
  lines.push("");

  // Structure
  const structLines: string[] = [];
  if (s.hasSrcDir) structLines.push(m.structure.srcDir);
  if (s.hasAppDir) structLines.push(m.structure.appRouter);
  if (s.hasPagesDir) structLines.push(m.structure.pagesRouter);
  if (s.hasApiRoutes) structLines.push(m.structure.apiRoutes);
  if (s.hasMiddleware) structLines.push(m.structure.middleware);
  if (s.hasComponentsDir) structLines.push(m.structure.components);
  if (s.hasLibDir) structLines.push(m.structure.sharedUtils);
  if (s.hasServicesDir) structLines.push(m.structure.services);
  if (s.hasHooksDir) structLines.push(m.structure.customHooks);
  if (s.hasStoreDir) structLines.push(m.structure.stateStores);
  if (s.hasSchemasDir) structLines.push(m.structure.validationSchemas);
  if (s.hasTypesDir) structLines.push(m.structure.typeDefinitions);
  if (s.hasConfigDir) structLines.push(m.structure.configuration);
  if (s.hasProvidersDir) structLines.push(m.structure.reactProviders);
  if (s.hasPrismaSchema) structLines.push(m.structure.prismaSchema);
  if (structLines.length > 0) {
    lines.push("**Structure:**");
    for (const sl of structLines) lines.push(`- ${sl}`);
    lines.push("");
  }

  // Scripts
  const scripts = Object.entries(analysis.scripts);
  if (scripts.length > 0) {
    lines.push("**Scripts:**");
    for (const [name, cmd] of scripts) {
      lines.push(`- \`npm run ${name}\` → \`${cmd}\``);
    }
    lines.push("");
  }

  // Existing code patterns (merged into overview)
  if (patterns) {
    const patternLines: string[] = [];
    if (patterns.totalComponents > 0) {
      patternLines.push(interpolate(m.patterns.clientServerRatio, {
        clientCount: patterns.useClientCount,
        totalCount: patterns.totalComponents,
        clientPercent: Math.round(patterns.clientRatio * 100),
      }));
    }
    if (patterns.useServerCount > 0) {
      patternLines.push(interpolate(m.patterns.serverActions, { count: patterns.useServerCount }));
    }
    if (patterns.usesPathAlias) patternLines.push(m.patterns.pathAliases);
    if (patterns.hasBarrelFiles) patternLines.push(m.patterns.barrelFiles);
    if (patternLines.length > 0) {
      lines.push("**Codebase patterns:**");
      for (const pl of patternLines) lines.push(`- ${pl}`);
      lines.push("");
    }
  }

  // Per-tech documentation (from Context7 + WebSearch)
  const techEntries = Object.entries(docs.techDocs);
  if (techEntries.length > 0) {
    for (const [tech, docContent] of techEntries) {
      if (!docContent.trim()) continue;
      lines.push(`## ${techDisplayName(tech)}`);
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

  // Conventions: naming + imports in one section
  lines.push("## Conventions");
  lines.push("");
  lines.push(`- ${m.naming.files}`);
  lines.push(`- ${m.naming.reactComponents}`);
  lines.push(`- ${m.naming.hooks}`);
  lines.push(`- ${m.naming.constants}`);
  if (s.hasSrcDir) lines.push(`- ${m.naming.newFilesSrc}`);
  lines.push(`- Import order: Node builtins → external packages → internal aliases (@/) → relative imports → type imports`);
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

  return lines.join("\n");
}
