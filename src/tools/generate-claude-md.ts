import { writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { generateClaudeMd } from "../templates/claude-md.js";
import { analyzePatterns } from "../analyzers/patterns.js";
import type { RepoAnalysis, FetchedDocs } from "../types.js";

export function registerGenerateClaudeMd(server: McpServer): void {
  server.registerTool(
    "generate-claude-md",
    {
      title: "Generate CLAUDE.md",
      description: [
        "Generate and write a CLAUDE.md file for a project.",
        "",
        "WARNING: Do NOT call this tool without the 'docs' parameter.",
        "Without docs, the CLAUDE.md will be an empty skeleton with no tech documentation, no best practices, no cross-stack rules.",
        "The full workflow MUST be followed before calling this tool:",
        "1. analyze-repo → get the project analysis",
        "2. For EACH tech: resolve-library-id + query-docs (Context7) to get official docs",
        "3. For EACH tech: WebSearch for community best practices",
        "4. Synthesize rules per tech (3-5 actionable rules each)",
        "5. Produce cross-stack conventions for interacting tech pairs",
        "6. THEN call this tool with analysis + docs",
        "",
        "Use the setup-project prompt to orchestrate the full workflow automatically.",
        "",
        "Requires the output of analyze-repo as the 'analysis' parameter.",
        "docs format: { \"techDocs\": { \"next\": \"- rule 1\\n- rule 2\", ... }, \"crossDocs\": { \"all\": \"- cross rule 1\\n...\" } }",
        "Each techDocs value: 3-5 concise actionable rules per technology.",
        "crossDocs 'all' value: unified rules describing how all techs work together.",
      ].join("\n"),
      inputSchema: {
        analysis: z
          .string()
          .describe("JSON string of RepoAnalysis (output of analyze-repo)"),
        docs: z
          .string()
          .optional()
          .describe(
            'JSON string of synthesized documentation: { "techDocs": Record<string, string>, "crossDocs": Record<string, string> }. Each value should be concise, actionable rules (not raw code snippets). If omitted, CLAUDE.md is generated without technology documentation.'
          ),
        choices: z
          .string()
          .optional()
          .describe(
            "JSON string of user choices: Record<string, string> mapping topic to chosen option. Optional."
          ),
      },
    },
    async ({ analysis: analysisStr, docs: docsStr, choices: choicesStr }) => {
      try {
        let analysis: RepoAnalysis;
        try {
          analysis = JSON.parse(analysisStr);
        } catch {
          return { isError: true, content: [{ type: "text" as const, text: "Invalid analysis JSON. Pass the raw output of analyze-repo." }] };
        }
        if (!analysis.projectPath || !analysis.detected) {
          return { isError: true, content: [{ type: "text" as const, text: "Malformed analysis: missing projectPath or detected stack." }] };
        }

        let choices: Record<string, string> = {};
        if (choicesStr) {
          try { choices = JSON.parse(choicesStr); } catch {
            return { isError: true, content: [{ type: "text" as const, text: "Invalid choices JSON." }] };
          }
        }

        let parsedDocs: Record<string, unknown> = {};
        if (docsStr) {
          try { parsedDocs = JSON.parse(docsStr); } catch {
            return { isError: true, content: [{ type: "text" as const, text: "Invalid docs JSON." }] };
          }
        }
        const docs: FetchedDocs = {
          techDocs: (parsedDocs.techDocs as Record<string, string>) ?? {},
          crossDocs: (parsedDocs.crossDocs as Record<string, string>) ?? {},
          metadata: (parsedDocs.metadata as FetchedDocs["metadata"]) ?? {
            techCount: Object.keys((parsedDocs.techDocs as Record<string, string>) ?? {}).length,
            snippetCount: 0,
            failedTechs: [],
          },
        };

        // Verify project path still exists
        try {
          await stat(analysis.projectPath);
        } catch {
          return {
            isError: true,
            content: [{ type: "text" as const, text: `Project directory not found: ${analysis.projectPath}` }],
          };
        }

        const patterns = await analyzePatterns(analysis.projectPath);

        const content = generateClaudeMd(
          analysis,
          docs,
          choices,
          patterns
        );

        const outputPath = join(analysis.projectPath, "CLAUDE.md");
        await writeFile(outputPath, content, "utf-8");

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  path: outputPath,
                  message: "CLAUDE.md generated successfully",
                  stats: {
                    techDocs: Object.keys(docs.techDocs).length,
                    crossDocs: Object.keys(docs.crossDocs).length,
                    choices: Object.keys(choices).length,
                    failedTechs: docs.metadata.failedTechs,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: "text" as const, text: `generate-claude-md failed: ${message}` }],
        };
      }
    }
  );
}
