import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TECH_QUERIES } from "../data/tech-queries.js";

export function registerTechQueriesResource(server: McpServer): void {
  server.resource(
    "tech-queries",
    "leadcode://tech-queries",
    {
      description:
        "Maps detected technology identifiers to Context7 library names and recommended queries. Read this after analyze-repo to know what to ask Context7 for each detected tech.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "leadcode://tech-queries",
          mimeType: "application/json",
          text: JSON.stringify(TECH_QUERIES, null, 2),
        },
      ],
    })
  );
}
