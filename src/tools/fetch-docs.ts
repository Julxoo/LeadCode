import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { RepoAnalysis } from "../types.js";
import { fetchAllDocs } from "../context7/index.js";

export function registerFetchDocs(server: McpServer): void {
  server.registerTool(
    "fetch-docs",
    {
      title: "Fetch Documentation",
      description:
        "Fetches up-to-date documentation from Context7 for each technology detected in the project. Returns doc snippets organized by technology and cross-technology combinations.",
      inputSchema: {
        analysis: z
          .string()
          .describe("JSON string of RepoAnalysis (output of analyze-repo)"),
      },
    },
    async ({ analysis: analysisStr }) => {
      try {
        const analysis: RepoAnalysis = JSON.parse(analysisStr);
        const docs = await fetchAllDocs(analysis);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(docs, null, 2),
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `fetch-docs failed: ${message}`,
            },
          ],
        };
      }
    }
  );
}
