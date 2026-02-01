import { writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { generateClaudeMd } from "../templates/claude-md.js";
import { analyzePatterns } from "../analyzers/patterns.js";
import { fetchAllDocs } from "../context7/index.js";
import type { RepoAnalysis } from "../types.js";

export function registerGenerateClaudeMd(server: McpServer): void {
  server.registerTool(
    "generate-claude-md",
    {
      title: "Generate CLAUDE.md",
      description:
        "Fetches up-to-date documentation from Context7 for each detected technology, then generates a structured CLAUDE.md file. Writes it directly to the project root.",
      inputSchema: {
        analysis: z
          .string()
          .describe("JSON string of RepoAnalysis (output of analyze-repo)"),
        choices: z
          .string()
          .optional()
          .describe(
            "JSON string of user choices: Record<string, string> mapping topic to chosen option. Optional."
          ),
      },
    },
    async ({ analysis: analysisStr, choices: choicesStr }) => {
      try {
        const analysis: RepoAnalysis = JSON.parse(analysisStr);
        const choices: Record<string, string> = choicesStr
          ? JSON.parse(choicesStr)
          : {};

        // Verify project path still exists
        try {
          await stat(analysis.projectPath);
        } catch {
          return {
            isError: true,
            content: [{ type: "text" as const, text: `Project directory not found: ${analysis.projectPath}` }],
          };
        }

        // Fetch docs from Context7 internally
        const docs = await fetchAllDocs(analysis);
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
