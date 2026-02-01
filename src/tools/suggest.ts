import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { RepoAnalysis, Gap, Suggestion, SuggestionOption } from "../types.js";
import { getMessages } from "../i18n/index.js";

function opt(o: { description: string; pros: string[]; cons: string[]; claudeImpact: string }, level: SuggestionOption["level"]): SuggestionOption {
  return { level, description: o.description, pros: o.pros, cons: o.cons, claudeImpact: o.claudeImpact };
}

function buildSuggestions(analysis: RepoAnalysis, gaps: Gap[]): Suggestion[] {
  const m = getMessages("en").suggestions;
  const suggestions: Suggestion[] = [];

  for (const gap of gaps) {
    switch (gap.category) {
      case "testing":
        suggestions.push({
          topic: m.testing.topic,
          options: [opt(m.testing.simple, "simple"), opt(m.testing.clean, "clean"), opt(m.testing.scalable, "scalable")],
        });
        break;
      case "input-validation":
        suggestions.push({ topic: m.inputValidation.topic, options: [opt(m.inputValidation.simple, "simple"), opt(m.inputValidation.clean, "clean")] });
        break;
      case "error-handling":
        suggestions.push({ topic: m.errorHandling.topic, options: [opt(m.errorHandling.simple, "simple"), opt(m.errorHandling.clean, "clean")] });
        break;
      case "shared-schemas":
        suggestions.push({ topic: m.schemaOrg.topic, options: [opt(m.schemaOrg.simple, "simple"), opt(m.schemaOrg.clean, "clean")] });
        break;
      case "component-structure":
        suggestions.push({ topic: m.componentStructure.topic, options: [opt(m.componentStructure.simple, "simple"), opt(m.componentStructure.clean, "clean")] });
        break;
      case "auth-middleware":
        suggestions.push({ topic: m.authMiddleware.topic, options: [opt(m.authMiddleware.simple, "simple"), opt(m.authMiddleware.clean, "clean")] });
        break;
      case "loading-states":
        suggestions.push({ topic: m.loadingStates.topic, options: [opt(m.loadingStates.simple, "simple"), opt(m.loadingStates.clean, "clean")] });
        break;
      case "metadata":
        suggestions.push({ topic: m.metadata.topic, options: [opt(m.metadata.simple, "simple"), opt(m.metadata.clean, "clean")] });
        break;
      case "prisma-client-singleton":
        suggestions.push({ topic: m.prismaClient.topic, options: [opt(m.prismaClient.simple, "simple")] });
        break;
      case "auth-session":
        suggestions.push({ topic: m.authSession.topic, options: [opt(m.authSession.simple, "simple"), opt(m.authSession.clean, "clean")] });
        break;
      case "env-validation":
        suggestions.push({ topic: m.envValidation.topic, options: [opt(m.envValidation.simple, "simple"), opt(m.envValidation.clean, "clean")] });
        break;
      case "types-dir":
        suggestions.push({ topic: m.typesDir.topic, options: [opt(m.typesDir.simple, "simple")] });
        break;
      case "store-organization":
        suggestions.push({ topic: m.storeOrg.topic, options: [opt(m.storeOrg.simple, "simple")] });
        break;
      case "drizzle-schema-org":
        suggestions.push({ topic: m.drizzleSchema.topic, options: [opt(m.drizzleSchema.simple, "simple"), opt(m.drizzleSchema.clean, "clean")] });
        break;
      default:
        suggestions.push({
          topic: gap.message,
          options: [{
            level: "simple",
            description: `Address: ${gap.message}`,
            pros: m.genericPros,
            cons: m.genericCons,
            claudeImpact: m.genericClaudeImpact,
          }],
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
        analysis: z.string().describe("JSON string of RepoAnalysis"),
        gaps: z.string().describe("JSON string of gaps array (output of detect-gaps)"),
      },
    },
    async ({ analysis: analysisStr, gaps: gapsStr }) => {
      try {
        const analysis: RepoAnalysis = JSON.parse(analysisStr);
        const parsed = JSON.parse(gapsStr);
        const gaps: Gap[] = Array.isArray(parsed) ? parsed : parsed.gaps;
        const suggestions = buildSuggestions(analysis, gaps);

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ suggestions }, null, 2) }],
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
