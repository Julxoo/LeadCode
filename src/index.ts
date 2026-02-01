import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod";
import { registerAnalyzeRepo } from "./tools/analyze-repo.js";
import { registerGenerateClaudeMd } from "./tools/generate-claude-md.js";
import { registerValidateClaudeMd } from "./tools/validate-claude-md.js";
import { registerTechQueriesResource } from "./resources/tech-queries.js";

const server = new McpServer({
  name: "leadcode",
  version: "1.1.0",
});

// Register tools
registerAnalyzeRepo(server);
registerGenerateClaudeMd(server);
registerValidateClaudeMd(server);

// Register resources
registerTechQueriesResource(server);

// Register prompts
server.prompt(
  "setup-project",
  "Generate a CLAUDE.md for a project. Use when the user wants to setup, init, configure, or generate rules/CLAUDE.md for any project.",
  {
    projectPath: z.string().describe("Absolute path to the project root. Use the current working directory if not specified."),
    language: z.string().optional().describe("Output language: 'fr' for French, 'en' for English (default: en)"),
  },
  ({ projectPath, language }) => {
    const isFr = language === "fr";

    const steps = isFr
      ? [
          `Tu configures LeadCode pour le projet à ${projectPath}. Suis ces étapes dans l'ordre :`,
          "",
          "## Étape 1 : Analyser le projet",
          "",
          `Appelle l'outil analyze-repo avec projectPath="${projectPath}".`,
          "Présente un résumé clair du stack détecté (framework, ORM, auth, CSS, testing, etc.).",
          "",
          "## Étape 2 : Lire le mapping tech-queries",
          "",
          'Lis la ressource LeadCode "leadcode://tech-queries".',
          "Elle contient pour chaque technologie détectée :",
          "- libraryName : le nom de la librairie sur Context7",
          "- queries : les questions à poser",
          "- crossQueries : les questions pour les combinaisons de techs",
          "",
          "## Étape 3 : Récupérer et synthétiser la documentation",
          "",
          "Pour chaque technologie détectée qui a un mapping dans tech-queries :",
          "",
          "a) Appelle l'outil Context7 resolve-library-id avec le libraryName et la query",
          "b) Appelle l'outil Context7 query-docs avec l'ID résolu et les queries",
          "c) SYNTHÉTISE les docs brutes en 3-5 règles concises et actionnables :",
          "   - Conventions (organisation des fichiers, nommage, quand utiliser quoi)",
          "   - Patterns importants (singleton, data access layer, etc.)",
          "   - Pièges à éviter (restrictions d'import, limites runtime)",
          "   - PAS de blocs de code complets — juste des exemples inline courts si nécessaire",
          "",
          "## Étape 4 : WebSearch — Best practices, architecture & gotchas",
          "",
          "Pour chaque technologie majeure détectée, utilise WebSearch pour compléter Context7 :",
          "a) Cherche '{tech} {version} best practices architecture 2026' pour chaque tech majeure.",
          "b) Cherche '{tech} {version} breaking changes migration' si la version détectée est récente.",
          "c) Cherche la combinaison complète du stack '{tech1} {tech2} {tech3} project architecture best practices'.",
          "Intègre les résultats dans les règles par tech (techDocs) et cross-stack (crossDocs).",
          "Focus : structure de projet, patterns d'architecture, tips performance, pièges sécurité, conventions communautaires NON couvertes par la doc officielle.",
          "",
          "## Étape 5 : Conventions cross-stack unifiées",
          "",
          "À partir de TOUTES les docs Context7 + résultats WebSearch + crossQueries de tech-queries,",
          "produis UNE SEULE section de règles cross-stack qui décrit comment toutes les techs",
          "détectées fonctionnent ensemble (pas en paires séparées).",
          "Pense en workflows réels : 'Pour créer un formulaire : composant shadcn + validation Zod + Server Action + messages d'erreur i18n'.",
          "Concentre-toi sur les règles qui impliquent plusieurs techs simultanément.",
          "Place le résultat dans crossDocs sous la clé 'all'.",
          "",
          "## Étape 6 : Construire le JSON docs",
          "",
          "Construis un objet JSON avec cette structure :",
          '{ "techDocs": { "next": "- règle 1\\n- règle 2...", ... }, "crossDocs": { "all": "- règle cross 1\\n- règle cross 2..." } }',
          "",
          "## Étape 7 : Générer le CLAUDE.md",
          "",
          "Appelle generate-claude-md avec :",
          "- analysis : le JSON de l'analyse (étape 1)",
          "- docs : le JSON des docs synthétisées (étape 6)",
          "",
          "## Si Context7 n'est pas disponible",
          "",
          "Si les outils Context7 (resolve-library-id) ne sont pas disponibles,",
          "passe directement à l'étape 5 sans docs. Informe l'utilisateur que la documentation",
          "n'a pas pu être récupérée et que le CLAUDE.md ne contiendra que l'analyse du projet.",
          "",
          "Réponds en français.",
        ]
      : [
          `You are setting up LeadCode for the project at ${projectPath}. Follow these steps in order:`,
          "",
          "## Step 1: Analyze the project",
          "",
          `Call the analyze-repo tool with projectPath="${projectPath}".`,
          "Present a clear summary of the detected stack (framework, ORM, auth, CSS, testing, etc.).",
          "",
          "## Step 2: Read the tech-queries mapping",
          "",
          'Read the LeadCode resource "leadcode://tech-queries".',
          "It contains for each detected technology:",
          "- libraryName: the Context7 library identifier",
          "- queries: questions to ask Context7",
          "- crossQueries: questions for technology combinations",
          "",
          "## Step 3: Fetch and synthesize documentation",
          "",
          "For each detected technology that has a mapping in tech-queries:",
          "",
          "a) Call Context7 resolve-library-id with the libraryName and the query",
          "b) Call Context7 query-docs with the resolved libraryId and the queries",
          "c) SYNTHESIZE the raw docs into 3-5 concise, actionable rules:",
          "   - Conventions (file organization, naming, when to use what)",
          "   - Important patterns (singleton, data access layer, etc.)",
          "   - Gotchas to avoid (import restrictions, runtime boundaries)",
          "   - NO full code blocks — only short inline examples if needed",
          "",
          "## Step 4: WebSearch — Best practices, architecture & gotchas",
          "",
          "For each major detected technology, use WebSearch to complement Context7 with real-world knowledge:",
          "a) Search '{tech} {version} best practices architecture 2026' for each major tech.",
          "b) Search '{tech} {version} breaking changes migration' if the detected version is recent.",
          "c) Search the full stack combination '{tech1} {tech2} {tech3} project architecture best practices'.",
          "Incorporate results into per-tech rules (techDocs) and cross-stack rules (crossDocs).",
          "Focus on: project structure, architecture patterns, performance tips, security gotchas, and community conventions NOT covered by official docs.",
          "",
          "## Step 5: Unified cross-stack conventions",
          "",
          "Using ALL Context7 docs + WebSearch results + crossQueries from tech-queries,",
          "produce ONE unified set of cross-stack rules describing how ALL detected technologies",
          "work together as a whole (not pairwise).",
          "Think in terms of real workflows: 'When creating a form, use shadcn components + Zod validation + Server Action + i18n error messages'.",
          "Focus on rules that span multiple techs simultaneously.",
          "Put the result in crossDocs under the key 'all'.",
          "",
          "## Step 6: Build the docs JSON",
          "",
          "Build a JSON object with this structure:",
          '{ "techDocs": { "next": "- rule 1\\n- rule 2...", ... }, "crossDocs": { "all": "- cross rule 1\\n- cross rule 2..." } }',
          "",
          "## Step 7: Generate CLAUDE.md",
          "",
          "Call generate-claude-md with:",
          "- analysis: the JSON from step 1",
          "- docs: the JSON of synthesized docs from step 6",
          "",
          "## If Context7 is not available",
          "",
          "If Context7 tools (resolve-library-id) are not available,",
          "skip to step 5 without docs. Inform the user that documentation",
          "could not be fetched and the CLAUDE.md will only contain project analysis.",
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
  "update-project",
  "Update or refresh an existing CLAUDE.md. Re-analyzes the project, fetches fresh documentation, and regenerates while preserving user decisions.",
  {
    projectPath: z.string().describe("Absolute path to the project root. Use the current working directory if not specified."),
    language: z.string().optional().describe("Output language: 'fr' for French, 'en' for English (default: en)"),
  },
  ({ projectPath, language }) => {
    const isFr = language === "fr";

    const steps = isFr
      ? [
          `Tu mets à jour le CLAUDE.md du projet à ${projectPath}.`,
          "",
          "## Étape préalable : Extraire les décisions existantes",
          "",
          `Lis le fichier ${projectPath}/CLAUDE.md s'il existe.`,
          'Cherche la section "## Project Decisions".',
          'Extrais toutes les entrées au format "- **Sujet**: Choix".',
          "Garde-les pour l'étape finale.",
          "",
          "## Ensuite : même flow que setup-project",
          "",
          "Suis les mêmes étapes que setup-project (analyze → tech-queries → Context7 → synthèse → generate),",
          "mais passe les décisions extraites en paramètre choices à generate-claude-md.",
          "",
          "Réponds en français.",
        ]
      : [
          `You are updating the CLAUDE.md for the project at ${projectPath}.`,
          "",
          "## Preliminary step: Extract existing decisions",
          "",
          `Read the file ${projectPath}/CLAUDE.md if it exists.`,
          'Look for the "## Project Decisions" section.',
          'Extract all entries in the format "- **Topic**: Choice".',
          "Keep them for the final step.",
          "",
          "## Then: same flow as setup-project",
          "",
          "Follow the same steps as setup-project (analyze → tech-queries → Context7 → synthesize → generate),",
          "but pass the extracted decisions as the choices parameter to generate-claude-md.",
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
  "Check if a CLAUDE.md is still up to date. Use when the user wants to validate, check, verify, or audit their CLAUDE.md.",
  {
    projectPath: z.string().describe("Absolute path to the project root. Use the current working directory if not specified."),
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
          "3. Si des décalages existent, suggère de lancer update-project pour régénérer.",
          "",
          "Réponds en français.",
        ]
      : [
          `Please validate the CLAUDE.md for the project at ${projectPath}.`,
          "",
          `1. Call validate-claude-md with projectPath="${projectPath}".`,
          "2. Present any drifts found with clear explanations.",
          "3. If drifts are found, suggest running the update-project prompt to regenerate.",
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
