import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { RepoAnalysis, Gap, Suggestion } from "../types.js";

function buildSuggestions(analysis: RepoAnalysis, gaps: Gap[]): Suggestion[] {
  const suggestions: Suggestion[] = [];

  for (const gap of gaps) {
    switch (gap.category) {
      case "testing":
        suggestions.push({
          topic: "Testing Strategy",
          options: [
            {
              level: "simple",
              description: "Add Vitest for unit tests only",
              pros: ["Fast setup", "Lightweight", "Great DX"],
              cons: ["No E2E coverage"],
              claudeImpact:
                "Claude will generate unit tests alongside new functions when asked.",
            },
            {
              level: "clean",
              description: "Vitest + Testing Library for component tests",
              pros: ["Unit + component coverage", "Tests user behavior"],
              cons: ["More setup", "Slower component tests"],
              claudeImpact:
                "Claude will generate both unit and component tests with proper render/assert patterns.",
            },
            {
              level: "scalable",
              description:
                "Vitest + Testing Library + Playwright for E2E",
              pros: ["Full coverage pyramid", "Catches integration bugs"],
              cons: ["Significant setup", "Slower CI"],
              claudeImpact:
                "Claude will generate tests at all levels and respect the testing pyramid.",
            },
          ],
        });
        break;

      case "input-validation":
        suggestions.push({
          topic: "Input Validation",
          options: [
            {
              level: "simple",
              description: "Add Zod for manual validation in API routes",
              pros: ["Minimal", "TypeScript-native"],
              cons: ["Must remember to validate each route"],
              claudeImpact:
                "Claude will add z.object().parse() in API routes when reminded.",
            },
            {
              level: "clean",
              description:
                "Zod with shared schemas directory and middleware",
              pros: ["DRY schemas", "Consistent validation"],
              cons: ["More structure upfront"],
              claudeImpact:
                "Claude will import shared schemas and validate automatically in every route.",
            },
          ],
        });
        break;

      case "error-handling":
        suggestions.push({
          topic: "Error Handling",
          options: [
            {
              level: "simple",
              description: "Add error.tsx in each route segment",
              pros: ["Quick", "Follows Next.js conventions"],
              cons: ["No structured error logging"],
              claudeImpact:
                "Claude will create error.tsx files and handle errors gracefully.",
            },
            {
              level: "clean",
              description:
                "Error boundaries + centralized error utilities + structured logging",
              pros: ["Consistent error format", "Debuggable"],
              cons: ["More setup"],
              claudeImpact:
                "Claude will use the error utilities consistently and produce debuggable error responses.",
            },
          ],
        });
        break;

      case "shared-schemas":
        suggestions.push({
          topic: "Schema Organization",
          options: [
            {
              level: "simple",
              description: "Co-locate schemas next to their API routes",
              pros: ["Easy to find", "No indirection"],
              cons: ["Schemas get duplicated across routes"],
              claudeImpact:
                "Claude will duplicate schemas when the same data is used in multiple routes.",
            },
            {
              level: "clean",
              description: "Shared /lib/schemas/ directory",
              pros: ["Single source of truth", "DRY"],
              cons: ["One more directory to manage"],
              claudeImpact:
                "Claude will find and reuse schemas consistently across routes and forms.",
            },
          ],
        });
        break;

      case "component-structure":
        suggestions.push({
          topic: "Component Organization",
          options: [
            {
              level: "simple",
              description: "Flat /components directory",
              pros: ["Simple", "Works for small projects"],
              cons: ["Gets messy at scale"],
              claudeImpact:
                "Claude will place all components in one directory.",
            },
            {
              level: "clean",
              description:
                "Feature-based organization: /components/ui/ + /components/[feature]/",
              pros: ["Scales well", "Clear ownership"],
              cons: ["More directories"],
              claudeImpact:
                "Claude will organize components by feature and reuse UI primitives.",
            },
          ],
        });
        break;

      case "auth-middleware":
        suggestions.push({
          topic: "Route Protection",
          options: [
            {
              level: "simple",
              description: "Check auth in each Server Component/route handler",
              pros: ["Explicit", "Easy to understand"],
              cons: ["Easy to forget on new routes"],
              claudeImpact:
                "Claude may forget auth checks on new routes unless reminded.",
            },
            {
              level: "clean",
              description:
                "middleware.ts with route matcher + per-route checks as backup",
              pros: ["Centralized", "Defense in depth"],
              cons: ["Middleware can be tricky to debug"],
              claudeImpact:
                "Claude will add routes to the protected matcher and still add server-side checks.",
            },
          ],
        });
        break;

      case "loading-states":
        suggestions.push({
          topic: "Loading States",
          options: [
            {
              level: "simple",
              description: "Add a single loading.tsx at the root app/ level",
              pros: ["Quick", "Covers all routes"],
              cons: ["Same loading UI everywhere"],
              claudeImpact:
                "Claude will see the pattern and create loading.tsx for new route segments.",
            },
            {
              level: "clean",
              description: "Per-segment loading.tsx with skeleton UIs matching each page layout",
              pros: ["Better UX", "Layout-aware skeletons"],
              cons: ["More files to maintain"],
              claudeImpact:
                "Claude will create matching skeleton UIs for each new route segment.",
            },
          ],
        });
        break;

      case "metadata":
        suggestions.push({
          topic: "SEO & Metadata",
          options: [
            {
              level: "simple",
              description: "Static metadata export in each page.tsx",
              pros: ["Simple", "Covers basic SEO"],
              cons: ["No dynamic metadata for dynamic routes"],
              claudeImpact:
                "Claude will add export const metadata to new pages.",
            },
            {
              level: "clean",
              description: "generateMetadata for dynamic pages + static metadata for others",
              pros: ["Dynamic title/description per route", "Full SEO control"],
              cons: ["More boilerplate per page"],
              claudeImpact:
                "Claude will generate proper generateMetadata functions with dynamic data.",
            },
          ],
        });
        break;

      case "prisma-client-singleton":
        suggestions.push({
          topic: "Prisma Client Singleton",
          options: [
            {
              level: "simple",
              description: "globalThis pattern in lib/prisma.ts",
              pros: ["Standard approach", "Prevents hot-reload leaks"],
              cons: ["Requires discipline to always import from there"],
              claudeImpact:
                "Claude will import from lib/prisma.ts consistently.",
            },
          ],
        });
        break;

      case "auth-session":
        suggestions.push({
          topic: "Auth Utility",
          options: [
            {
              level: "simple",
              description: "Create lib/auth.ts with getCurrentUser() function",
              pros: ["Centralized", "Easy to use"],
              cons: ["Must remember to use it"],
              claudeImpact:
                "Claude will call getCurrentUser() in Server Components and Route Handlers.",
            },
            {
              level: "clean",
              description: "lib/auth.ts with getCurrentUser() + requireAuth() that throws on no session",
              pros: ["Fail-safe", "Clear intent"],
              cons: ["Slightly more code"],
              claudeImpact:
                "Claude will use requireAuth() at the top of protected routes automatically.",
            },
          ],
        });
        break;

      case "env-validation":
        suggestions.push({
          topic: "Environment Variable Validation",
          options: [
            {
              level: "simple",
              description: "Manual Zod validation in env.ts",
              pros: ["No extra deps", "Full control"],
              cons: ["Manual maintenance"],
              claudeImpact:
                "Claude will import env vars from env.ts and never use process.env directly.",
            },
            {
              level: "clean",
              description: "Use @t3-oss/env-nextjs for type-safe env with client/server separation",
              pros: ["Type-safe", "Client/server boundary enforcement"],
              cons: ["Extra dependency"],
              claudeImpact:
                "Claude will import from env.mjs and respect client/server env boundaries.",
            },
          ],
        });
        break;

      case "types-dir":
        suggestions.push({
          topic: "Shared Types Organization",
          options: [
            {
              level: "simple",
              description: "Create a types/ directory with domain-specific type files",
              pros: ["Clear location for shared types"],
              cons: ["One more directory"],
              claudeImpact:
                "Claude will place shared types in types/ and import from there.",
            },
          ],
        });
        break;

      case "store-organization":
        suggestions.push({
          topic: "Store Organization",
          options: [
            {
              level: "simple",
              description: "Create a store/ directory with one file per store",
              pros: ["Simple", "Easy to find"],
              cons: ["Flat structure"],
              claudeImpact:
                "Claude will create stores in store/ with clear naming.",
            },
          ],
        });
        break;

      case "drizzle-schema-org":
        suggestions.push({
          topic: "Drizzle Schema Organization",
          options: [
            {
              level: "simple",
              description: "All schemas in db/schema.ts",
              pros: ["Simple for small projects"],
              cons: ["Gets large fast"],
              claudeImpact:
                "Claude will add new tables to the single schema file.",
            },
            {
              level: "clean",
              description: "db/schema/ directory with one file per domain entity + index.ts barrel",
              pros: ["Scales well", "Easy to find"],
              cons: ["More files"],
              claudeImpact:
                "Claude will create new schema files per entity and export from index.ts.",
            },
          ],
        });
        break;

      default:
        // Generic suggestion for uncategorized gaps
        suggestions.push({
          topic: gap.message,
          options: [
            {
              level: "simple",
              description: `Address: ${gap.message}`,
              pros: ["Fixes the gap"],
              cons: ["May need further refinement"],
              claudeImpact:
                "Claude will follow the convention once documented in CLAUDE.md.",
            },
          ],
        });
        break;
    }
  }

  return suggestions;
}

export function registerSuggest(server: McpServer): void {
  server.registerTool(
    "suggest-conventions",
    {
      title: "Suggest Conventions",
      description:
        "Given a repo analysis and detected gaps, proposes structured options (simple / clean / scalable) for each gap. Each option includes pros, cons, and impact on Claude Code behavior.",
      inputSchema: {
        analysis: z
          .string()
          .describe("JSON string of RepoAnalysis"),
        gaps: z
          .string()
          .describe("JSON string of gaps array (output of detect-gaps)"),
      },
    },
    async ({ analysis: analysisStr, gaps: gapsStr }) => {
      try {
        const analysis: RepoAnalysis = JSON.parse(analysisStr);
        const parsed = JSON.parse(gapsStr);
        const gaps: Gap[] = Array.isArray(parsed) ? parsed : parsed.gaps;
        const suggestions = buildSuggestions(analysis, gaps);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ suggestions }, null, 2),
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: "text" as const, text: `suggest-conventions failed: ${message}` }],
        };
      }
    }
  );
}
