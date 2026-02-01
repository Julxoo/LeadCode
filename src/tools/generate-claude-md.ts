import { writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import {
  getConventions,
  getInterdictions,
  getActiveCrossRefs,
} from "../rules/index.js";
import { generateClaudeMd } from "../templates/claude-md.js";
import { analyzePatterns } from "../analyzers/patterns.js";
import type { RepoAnalysis } from "../types.js";
import type { Locale } from "../i18n/types.js";
import { getMessages, interpolate } from "../i18n/index.js";

export function registerGenerateClaudeMd(server: McpServer): void {
  server.registerTool(
    "generate-claude-md",
    {
      title: "Generate CLAUDE.md",
      description:
        "Generates a structured CLAUDE.md file from the repo analysis and user choices. Writes it directly to the project root. This file becomes the source of truth for Claude Code.",
      inputSchema: {
        analysis: z
          .string()
          .describe("JSON string of RepoAnalysis"),
        choices: z
          .string()
          .optional()
          .describe(
            "JSON string of user choices: Record<string, string> mapping topic to chosen option. Optional."
          ),
        language: z
          .enum(["en", "fr"])
          .optional()
          .describe("Output language for the generated CLAUDE.md (default: en)"),
      },
    },
    async ({ analysis: analysisStr, choices: choicesStr, language }) => {
      try {
        const locale: Locale = language ?? "en";
        const msg = getMessages(locale);
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
            content: [{ type: "text" as const, text: interpolate(msg.tools.dirNotFound, { path: analysis.projectPath }) }],
          };
        }

        const conventions = getConventions(analysis);
        const interdictions = getInterdictions(analysis);
        const crossRefs = getActiveCrossRefs(analysis);
        const patterns = await analyzePatterns(analysis.projectPath);

        const content = generateClaudeMd(
          analysis,
          conventions,
          interdictions,
          crossRefs,
          choices,
          patterns,
          locale
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
                  message: msg.tools.generateSuccess,
                  language: locale,
                  sections: {
                    conventions: conventions.length,
                    interdictions: interdictions.length,
                    crossStackRules: crossRefs.length,
                    choices: Object.keys(choices).length,
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
