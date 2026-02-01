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
  version: "0.2.0",
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
  "Full LeadCode workflow: analyze → detect gaps → suggest → generate CLAUDE.md. Supports language parameter for French or English output.",
  {
    projectPath: z.string().describe("Absolute path to the project root"),
    language: z.string().optional().describe("Output language: 'fr' for French, 'en' for English (default: en)"),
  },
  ({ projectPath, language }) => {
    const lang = language === "fr" ? "fr" : "en";
    const steps = lang === "fr"
      ? [
          `Configure LeadCode pour le projet à ${projectPath}. Suis ces étapes :`,
          "",
          `1. Lance analyze-repo avec projectPath="${projectPath}" pour scanner le projet.`,
          "2. Lance detect-gaps avec l'analyse pour identifier les manques structurels.",
          `3. Lance suggest-conventions avec l'analyse et les gaps, en passant language="${lang}".`,
          "4. Présente un résumé clair : ce qui est détecté, ce qui manque, et les options.",
          "5. Demande-moi mes préférences pour chaque point (simple / clean / scalable).",
          `6. Une fois mes choix faits, lance generate-claude-md avec mes choix et language="${lang}".`,
          "",
          "Explique chaque étape simplement. Réponds en français.",
        ]
      : [
          `Please set up LeadCode for the project at ${projectPath}. Follow these steps:`,
          "",
          `1. Call analyze-repo with projectPath="${projectPath}" to scan the project.`,
          "2. Call detect-gaps with the analysis to identify structural gaps.",
          `3. Call suggest-conventions with the analysis and gaps, passing language="${lang}".`,
          "4. Present the analysis, gaps, and suggestions to me in a clear summary.",
          "5. Ask me which options I prefer for each gap (simple / clean / scalable).",
          `6. Once I've chosen, call generate-claude-md with my choices and language="${lang}".`,
          "",
          "Be thorough and explain each gap and suggestion clearly.",
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
    const lang = language === "fr" ? "fr" : "en";
    const steps = lang === "fr"
      ? [
          `Vérifie le CLAUDE.md du projet à ${projectPath}.`,
          "",
          `1. Lance validate-claude-md avec projectPath="${projectPath}" et language="${lang}".`,
          "2. Présente les décalages trouvés avec des explications claires.",
          "3. Si des décalages existent, suggère s'il faut régénérer ou corriger manuellement.",
          "",
          "Réponds en français.",
        ]
      : [
          `Please validate the CLAUDE.md for the project at ${projectPath}.`,
          "",
          `1. Call validate-claude-md with projectPath="${projectPath}" and language="${lang}".`,
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
