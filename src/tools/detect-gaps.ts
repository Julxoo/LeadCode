import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { detectGaps } from "../rules/index.js";
import type { RepoAnalysis } from "../types.js";

export function registerDetectGaps(server: McpServer): void {
  server.registerTool(
    "detect-gaps",
    {
      title: "Detect Gaps",
      description:
        "Analyzes a repo analysis result and identifies structural gaps: missing error handling, no validation, no test framework, missing patterns, etc. Returns gaps with severity levels.",
      inputSchema: {
        analysis: z
          .string()
          .describe("JSON string of the RepoAnalysis object (output of analyze-repo)"),
      },
    },
    async ({ analysis: analysisStr }) => {
      try {
        const analysis: RepoAnalysis = JSON.parse(analysisStr);
        const gaps = detectGaps(analysis);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ gaps, total: gaps.length }, null, 2),
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: "text" as const, text: `detect-gaps failed: ${message}` }],
        };
      }
    }
  );
}
