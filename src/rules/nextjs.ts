import type { Rule } from "../types.js";

export const nextjsRules: Rule = {
  id: "nextjs",
  name: "Next.js",
  applies: (a) => a.framework?.name === "next",
  gaps: [
    {
      category: "error-handling",
      severity: "high",
      check: (a) => a.structure.hasAppDir && !a.structure.hasErrorBoundary,
      message: "No error boundary detected (error.tsx)",
      details:
        "App Router requires error.tsx files for proper error handling. Without them, errors crash the entire page.",
    },
    {
      category: "loading-states",
      severity: "medium",
      check: (a) => a.structure.hasAppDir && !a.structure.hasLoadingStates,
      message: "No loading states detected (loading.tsx)",
      details:
        "loading.tsx enables streaming SSR and instant navigation feedback.",
    },
    {
      category: "metadata",
      severity: "low",
      check: (a) => a.structure.hasAppDir && !a.structure.hasMetadata,
      message: "No metadata/SEO strategy detected",
      details:
        "Next.js App Router uses generateMetadata or metadata exports for SEO.",
    },
  ],
  conventions: [
    {
      id: "next-server-first",
      description: "Server Components by default",
      rule: "All components are Server Components unless they need interactivity. Add 'use client' only when required (event handlers, hooks, browser APIs).",
    },
    {
      id: "next-data-fetching",
      description: "Data fetching in Server Components",
      rule: "Fetch data in Server Components or Server Actions. Never fetch in Client Components unless it's user-triggered.",
    },
    {
      id: "next-route-handlers",
      description: "API route structure",
      rule: "Use route.ts files in app/api/ for API endpoints. Export named HTTP methods (GET, POST, PUT, DELETE).",
    },
    {
      id: "next-server-actions",
      description: "Server Actions for mutations",
      rule: "Use Server Actions ('use server') for form submissions and data mutations. Keep them in separate files (e.g., actions.ts).",
    },
    {
      id: "next-no-client-fetch",
      description: "No useEffect data fetching",
      rule: "Do NOT use useEffect + fetch for initial data loading. Use Server Components or React Query for client-side data.",
    },
  ],
  interdictions: [
    "NEVER use getServerSideProps or getStaticProps in App Router — these are Pages Router only.",
    "NEVER import server-only modules (fs, database clients) in Client Components.",
    "NEVER use 'use client' at layout level unless absolutely necessary — it forces all children to be Client Components.",
    "NEVER store sensitive data in client-accessible cookies or localStorage.",
  ],
  crossRefs: [],
};

export const nextjsPagesRules: Rule = {
  id: "nextjs-pages",
  name: "Next.js Pages Router",
  applies: (a) =>
    a.framework?.name === "next" && a.framework.variant === "pages-router",
  gaps: [],
  conventions: [
    {
      id: "pages-data-fetching",
      description: "Use getServerSideProps/getStaticProps",
      rule: "Use getServerSideProps for dynamic data, getStaticProps for static data. Never fetch in component body.",
    },
    {
      id: "pages-api-routes",
      description: "API routes in pages/api/",
      rule: "Keep API routes in pages/api/. Each file exports a default handler function.",
    },
  ],
  interdictions: [
    "NEVER use App Router patterns (Server Components, Server Actions) in Pages Router.",
    "NEVER use 'use client' directive — Pages Router components are all client by default.",
  ],
  crossRefs: [],
};
