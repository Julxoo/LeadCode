import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod";
import { registerAnalyzeRepo } from "./tools/analyze-repo.js";
import { registerDetectGaps } from "./tools/detect-gaps.js";
import { registerSuggest } from "./tools/suggest.js";
import { registerGenerateClaudeMd } from "./tools/generate-claude-md.js";
import { registerValidateClaudeMd } from "./tools/validate-claude-md.js";
import { registerUpdateClaudeMd } from "./tools/update-claude-md.js";

const server = new McpServer({
  name: "leadcode",
  version: "0.1.0",
});

// Register tools
registerAnalyzeRepo(server);
registerDetectGaps(server);
registerSuggest(server);
registerGenerateClaudeMd(server);
registerValidateClaudeMd(server);
registerUpdateClaudeMd(server);

// Register prompts
server.prompt(
  "setup-project",
  "Full LeadCode workflow: analyze repo → detect gaps → suggest conventions → generate CLAUDE.md",
  { projectPath: z.string().describe("Absolute path to the project root") },
  ({ projectPath }) => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: [
            `Please set up LeadCode for the project at ${projectPath}. Follow these steps:`,
            "",
            "1. Call analyze-repo to scan the project and get a full technical analysis.",
            "2. Call detect-gaps with the analysis to identify structural gaps.",
            "3. Call suggest-conventions with the analysis and gaps to get improvement options.",
            "4. Present the analysis, gaps, and suggestions to me in a clear summary.",
            "5. Ask me which options I prefer for each gap (simple / clean / scalable).",
            "6. Once I've chosen, call generate-claude-md with my choices to create the CLAUDE.md file.",
            "",
            "Be thorough and explain each gap and suggestion clearly.",
          ].join("\n"),
        },
      },
    ],
  })
);

server.prompt(
  "validate-project",
  "Check if an existing CLAUDE.md is still in sync with the project",
  { projectPath: z.string().describe("Absolute path to the project root") },
  ({ projectPath }) => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: [
            `Please validate the CLAUDE.md for the project at ${projectPath}.`,
            "",
            "1. Call validate-claude-md to check for drifts between the CLAUDE.md and actual project state.",
            "2. Present any drifts found with clear explanations.",
            "3. If drifts are found, suggest whether to regenerate or manually fix the CLAUDE.md.",
          ].join("\n"),
        },
      },
    ],
  })
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
