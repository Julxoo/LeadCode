import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod";
import { registerAnalyzeRepo } from "./tools/analyze-repo.js";
import { registerFetchDocs } from "./tools/fetch-docs.js";
import { registerGenerateClaudeMd } from "./tools/generate-claude-md.js";
import { registerValidateClaudeMd } from "./tools/validate-claude-md.js";
import { registerUpdateClaudeMd } from "./tools/update-claude-md.js";

const server = new McpServer({
  name: "leadcode",
  version: "1.0.0",
});

// Register tools
registerAnalyzeRepo(server);
registerFetchDocs(server);
registerGenerateClaudeMd(server);
registerValidateClaudeMd(server);
registerUpdateClaudeMd(server);

// Register prompts
server.prompt(
  "setup-project",
  "Full LeadCode workflow: analyze repo → generate CLAUDE.md with up-to-date conventions from Context7.",
  {
    projectPath: z.string().describe("Absolute path to the project root"),
    language: z.string().optional().describe("Output language: 'fr' for French, 'en' for English (default: en)"),
  },
  ({ projectPath, language }) => {
    const isFr = language === "fr";
    const steps = isFr
      ? [
          `Configure LeadCode pour le projet à ${projectPath}. Suis ces étapes :`,
          "",
          `1. Lance analyze-repo avec projectPath="${projectPath}" pour scanner le projet et détecter le stack.`,
          "2. Présente un résumé clair du stack détecté.",
          "3. Lance generate-claude-md avec l'analyse — il récupérera automatiquement la documentation à jour via Context7 et générera le CLAUDE.md.",
          "",
          "Explique chaque étape simplement. Réponds en français.",
        ]
      : [
          `Please set up LeadCode for the project at ${projectPath}. Follow these steps:`,
          "",
          `1. Call analyze-repo with projectPath="${projectPath}" to scan the project and detect the stack.`,
          "2. Present a summary of the detected stack.",
          "3. Call generate-claude-md with the analysis — it will automatically fetch up-to-date documentation via Context7 and generate the CLAUDE.md file.",
          "",
          "Be thorough and explain the results clearly.",
        ];

    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: steps.join("\n"),
          },
        },
      ],
    };
  }
);

server.prompt(
  "validate-project",
  "Check if an existing CLAUDE.md is still in sync with the project",
  {
    projectPath: z.string().describe("Absolute path to the project root"),
    language: z.string().optional().describe("Output language: 'fr' for French, 'en' for English (default: en)"),
  },
  ({ projectPath, language }) => {
    const isFr = language === "fr";
    const steps = isFr
      ? [
          `Vérifie le CLAUDE.md du projet à ${projectPath}.`,
          "",
          `1. Lance validate-claude-md avec projectPath="${projectPath}".`,
          "2. Présente les décalages trouvés avec des explications claires.",
          "3. Si des décalages existent, suggère s'il faut régénérer ou corriger manuellement.",
          "",
          "Réponds en français.",
        ]
      : [
          `Please validate the CLAUDE.md for the project at ${projectPath}.`,
          "",
          `1. Call validate-claude-md with projectPath="${projectPath}".`,
          "2. Present any drifts found with clear explanations.",
          "3. If drifts are found, suggest whether to regenerate or manually fix the CLAUDE.md.",
        ];

    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: steps.join("\n"),
          },
        },
      ],
    };
  }
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
