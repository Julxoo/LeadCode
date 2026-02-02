import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod";
import { registerAnalyzeRepo } from "./tools/analyze-repo.js";
import { registerGenerateClaudeMd } from "./tools/generate-claude-md.js";
import { registerValidateClaudeMd } from "./tools/validate-claude-md.js";

const server = new McpServer({
  name: "leadcode",
  version: "2.0.0",
});

// Register tools
registerAnalyzeRepo(server);
registerGenerateClaudeMd(server);
registerValidateClaudeMd(server);

// --- Shared prompt builder ---

function buildSetupSteps(projectPath: string, isFr: boolean): string[] {
  if (isFr) {
    return [
      `Tu génères un CLAUDE.md pour le projet à ${projectPath}. Suis ces étapes dans l'ordre.`,
      "",
      "## Étape 1 : Analyser",
      "",
      `Appelle analyze-repo avec projectPath="${projectPath}".`,
      "Présente un résumé du stack détecté.",
      "",
      "## Étape 2 : Identifier le stack complet",
      "",
      "Analyse le résultat de analyze-repo :",
      "- `recognized` : techs identifiées automatiquement avec catégorie et version.",
      "- `unrecognized` : deps non catégorisées. Identifie celles qui sont pertinentes (libs utilitaires, SDK, outils) et ignore le bruit (types, polyfills, helpers internes).",
      "- `topLevelDirs` + `srcDirs` : déduis l'architecture et les patterns du projet.",
      "- `engines`, `packageManager`, `workspaces` : identifie le contexte d'exécution.",
      "",
      "Produis une liste complète de toutes les technologies significatives du projet.",
      "",
      "## Étape 3 : Documentation officielle (Context7)",
      "",
      "Pour CHAQUE technologie significative (recognized + celles identifiées dans unrecognized) :",
      "a) Appelle resolve-library-id avec le nom de la technologie.",
      "b) Appelle query-docs avec l'ID résolu. Adapte la query au contexte du projet (version détectée, framework utilisé, patterns observés).",
      "c) Pour chaque paire de techs détectées qui interagissent dans le projet, appelle aussi query-docs avec une query décrivant leur intégration.",
      "",
      "Lance le maximum d'appels en parallèle.",
      "",
      "## Étape 4 : Best practices communautaires (WebSearch)",
      "",
      "Pour CHAQUE technologie détectée, utilise WebSearch pour compléter Context7 :",
      "a) '{tech} {version} best practices conventions {current_year}' — pour chaque tech.",
      "b) '{tech} {version} breaking changes migration' — si la version détectée est récente ou majeure.",
      "c) Pour chaque paire de techs détectées qui interagissent : '{tech1} {tech2} integration best practices {current_year}'.",
      "d) UNE recherche holistique du stack complet : '{framework} {orm} {css} {auth} {validation} project architecture best practices {current_year}'.",
      "",
      "Sois exhaustif : chaque tech mérite ses docs. Lance le maximum de recherches en parallèle.",
      "",
      "## Étape 5 : Synthèse par technologie",
      "",
      "Pour chaque tech, fusionne les résultats Context7 + WebSearch en 3-5 règles.",
      "",
      "Critères de qualité d'une règle :",
      "- ACTIONNABLE : dit quand et comment faire quelque chose (pas juste ce que c'est).",
      "- SPÉCIFIQUE : mentionne des APIs, des noms de fichiers, ou des patterns concrets.",
      "- NON-ÉVIDENT : n'est pas une reformulation du tagline de la lib.",
      "- PAS DE BLOCS DE CODE complets — juste des noms d'API ou exemples inline courts.",
      "",
      "Exemples :",
      "❌ MAUVAIS : 'Utilise Zod pour la validation'",
      "✅ BON : 'Utilise z.safeParse() dans les Server Actions — parse() throw et casse l'action'",
      "❌ MAUVAIS : 'Prisma est un ORM TypeScript'",
      "✅ BON : 'Instancie PrismaClient une seule fois (singleton) pour éviter l'épuisement des connexions en dev avec le hot reload'",
      "",
      "## Étape 6 : Conventions cross-stack unifiées",
      "",
      "Produis UNE section de règles cross-stack décrivant les workflows réels du projet.",
      "Identifie les workflows concrets du projet en analysant les techs détectées :",
      "- Comment les données transitent (fetching, mutation, cache, validation)",
      "- Comment l'UI est construite (composants, styling, état, formulaires)",
      "- Comment l'auth/sécurité s'intègre (middleware, routes protégées, tokens)",
      "- Comment les tests/qualité sont organisés (runner, mocking, linting)",
      "- Tout autre workflow pertinent détecté (i18n, email, payments, realtime, etc.)",
      "",
      "Adapte les catégories au projet. Un backend API n'a pas de section 'Styling'. Un site statique n'a pas de section 'Auth flow'.",
      "Chaque règle doit impliquer 2+ techs. Pas de règles single-tech ici.",
      "Place le résultat dans crossDocs sous la clé 'all'.",
      "",
      "## Étape 7 : Générer",
      "",
      "Construis le JSON :",
      '{ "techDocs": { "next": "- règle 1\\n- règle 2", ... }, "crossDocs": { "all": "- règle cross 1\\n..." } }',
      "",
      "Appelle generate-claude-md avec analysis (étape 1) + docs (ce JSON).",
      "",
      "## Adaptabilité",
      "",
      "- Si Context7 n'est pas disponible : utilise uniquement WebSearch. Le CLAUDE.md sera moins précis mais quand même utile.",
      "- Si ni Context7 ni WebSearch ne sont disponibles : appelle generate-claude-md sans docs. Informe l'utilisateur.",
      "- Si le projet a très peu de techs (1-2) : pas besoin de section cross-stack, passe crossDocs vide.",
      "",
      "Réponds en français.",
    ];
  }

  return [
    `You are generating a CLAUDE.md for the project at ${projectPath}. Follow these steps in order.`,
    "",
    "## Step 1: Analyze",
    "",
    `Call analyze-repo with projectPath="${projectPath}".`,
    "Present a summary of the detected stack.",
    "",
    "## Step 2: Identify the full stack",
    "",
    "Analyze the output of analyze-repo:",
    "- `recognized`: techs identified automatically with category and version.",
    "- `unrecognized`: uncategorized deps. Identify those that are relevant (utility libs, SDKs, tools) and ignore noise (types, polyfills, internal helpers).",
    "- `topLevelDirs` + `srcDirs`: infer the architecture and project patterns.",
    "- `engines`, `packageManager`, `workspaces`: identify the execution context.",
    "",
    "Produce a complete list of all significant technologies in the project.",
    "",
    "## Step 3: Official documentation (Context7)",
    "",
    "For EACH significant technology (recognized + those identified from unrecognized):",
    "a) Call resolve-library-id with the technology name.",
    "b) Call query-docs with the resolved ID. Adapt the query to the project context (detected version, framework used, observed patterns).",
    "c) For each pair of detected techs that interact in the project, also call query-docs with a query describing their integration.",
    "",
    "Run as many calls in parallel as possible.",
    "",
    "## Step 4: Community best practices (WebSearch)",
    "",
    "For EVERY detected technology, use WebSearch to complement Context7:",
    "a) '{tech} {version} best practices conventions {current_year}' — for each tech.",
    "b) '{tech} {version} breaking changes migration' — if the detected version is recent or major.",
    "c) For each pair of detected techs that interact: '{tech1} {tech2} integration best practices {current_year}'.",
    "d) ONE holistic search for the full stack: '{framework} {orm} {css} {auth} {validation} project architecture best practices {current_year}'.",
    "",
    "Be exhaustive: every tech deserves its docs. Run as many searches in parallel as possible.",
    "",
    "## Step 5: Per-technology synthesis",
    "",
    "For each tech, merge Context7 + WebSearch results into 3-5 rules.",
    "",
    "Quality criteria for a rule:",
    "- ACTIONABLE: tells when and how to do something (not just what it is).",
    "- SPECIFIC: mentions APIs, file names, or concrete patterns.",
    "- NON-OBVIOUS: not a restatement of the library's tagline.",
    "- NO full code blocks — only API names or short inline examples.",
    "",
    "Examples:",
    "❌ BAD: 'Use Zod for validation'",
    "✅ GOOD: 'Use z.safeParse() in Server Actions — parse() throws and breaks the action'",
    "❌ BAD: 'Prisma is a TypeScript ORM'",
    "✅ GOOD: 'Instantiate PrismaClient once (singleton) to avoid exhausting connections during dev hot reload'",
    "",
    "## Step 6: Unified cross-stack conventions",
    "",
    "Produce ONE cross-stack section describing the project's real workflows.",
    "Identify concrete workflows from the detected techs:",
    "- How data flows (fetching, mutation, cache, validation)",
    "- How UI is built (components, styling, state, forms)",
    "- How auth/security integrates (middleware, protected routes, tokens)",
    "- How tests/quality are organized (runner, mocking, linting)",
    "- Any other relevant detected workflow (i18n, email, payments, realtime, etc.)",
    "",
    "Adapt categories to the project. A backend API has no 'Styling' section. A static site has no 'Auth flow'.",
    "Every rule must involve 2+ techs. No single-tech rules here.",
    "Put the result in crossDocs under key 'all'.",
    "",
    "## Step 7: Generate",
    "",
    "Build the JSON:",
    '{ "techDocs": { "next": "- rule 1\\n- rule 2", ... }, "crossDocs": { "all": "- cross rule 1\\n..." } }',
    "",
    "Call generate-claude-md with analysis (step 1) + docs (this JSON).",
    "",
    "## Adaptability",
    "",
    "- If Context7 is not available: use WebSearch only. The CLAUDE.md will be less precise but still useful.",
    "- If neither Context7 nor WebSearch is available: call generate-claude-md without docs. Inform the user.",
    "- If the project has very few techs (1-2): no cross-stack section needed, pass empty crossDocs.",
  ];
}

// Register prompts
server.prompt(
  "setup-project",
  "Generate a CLAUDE.md for a project. Use when the user wants to setup, init, configure, or generate rules/CLAUDE.md for any project.",
  {
    projectPath: z.string().describe("Absolute path to the project root. Use the current working directory if not specified."),
    language: z.string().optional().describe("Output language: 'fr' for French, 'en' for English (default: en)"),
  },
  ({ projectPath, language }) => ({
    messages: [{
      role: "user" as const,
      content: { type: "text" as const, text: buildSetupSteps(projectPath, language === "fr").join("\n") },
    }],
  })
);

server.prompt(
  "update-project",
  "Update or refresh an existing CLAUDE.md. Re-analyzes the project, fetches fresh documentation, and regenerates while preserving still-relevant user decisions.",
  {
    projectPath: z.string().describe("Absolute path to the project root. Use the current working directory if not specified."),
    language: z.string().optional().describe("Output language: 'fr' for French, 'en' for English (default: en)"),
  },
  ({ projectPath, language }) => {
    const isFr = language === "fr";
    const preliminary = isFr
      ? [
          `Tu mets à jour le CLAUDE.md du projet à ${projectPath}.`,
          "",
          "## Étape préalable : Extraire et filtrer les décisions",
          "",
          `Lis le fichier ${projectPath}/CLAUDE.md s'il existe.`,
          'Extrais la section "## Project Decisions" (format : "- **Sujet**: Choix").',
          "",
          "Règles de filtrage :",
          "- Si la tech/sujet est toujours dans package.json → garde la décision.",
          "- Si la tech a été supprimée du projet → supprime la décision.",
          "- Si une version majeure a changé (ex: Next.js 14 → 15) → garde la décision mais note qu'elle devra être revérifiée.",
          "",
          "## Ensuite : flow complet de génération",
          "",
          "Suis exactement les étapes ci-dessous, puis passe les décisions filtrées en paramètre 'choices' à generate-claude-md.",
          "",
        ]
      : [
          `You are updating the CLAUDE.md for the project at ${projectPath}.`,
          "",
          "## Preliminary step: Extract and filter decisions",
          "",
          `Read the file ${projectPath}/CLAUDE.md if it exists.`,
          'Extract the "## Project Decisions" section (format: "- **Topic**: Choice").',
          "",
          "Filtering rules:",
          "- If the tech/topic is still in package.json → keep the decision.",
          "- If the tech was removed from the project → drop the decision.",
          "- If a major version changed (e.g., Next.js 14 → 15) → keep the decision but flag it for review.",
          "",
          "## Then: full generation flow",
          "",
          "Follow the steps below, then pass the filtered decisions as the 'choices' parameter to generate-claude-md.",
          "",
        ];

    const setupSteps = buildSetupSteps(projectPath, isFr);

    return {
      messages: [{
        role: "user" as const,
        content: { type: "text" as const, text: [...preliminary, ...setupSteps].join("\n") },
      }],
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
          `Vérifie si le CLAUDE.md du projet à ${projectPath} est à jour.`,
          "",
          `1. Appelle validate-claude-md avec projectPath="${projectPath}".`,
          "",
          "2. Classe les décalages trouvés par sévérité :",
          "   - **CRITIQUE** : framework absent ou version majeure différente, techno majeure manquante (ORM, auth, CSS), mauvais router détecté",
          "   - **MINEUR** : lib utilitaire manquante, version mineure différente, nouvelle devDependency non documentée",
          "",
          "3. Présente les résultats clairement avec cette classification.",
          "",
          "4. Si des décalages CRITIQUES existent → recommande fortement de lancer update-project.",
          "   Si seulement des décalages MINEURS → indique que la mise à jour est optionnelle.",
          "   Si aucun décalage → confirme que le CLAUDE.md est à jour.",
          "",
          "Réponds en français.",
        ]
      : [
          `Validate whether the CLAUDE.md for the project at ${projectPath} is up to date.`,
          "",
          `1. Call validate-claude-md with projectPath="${projectPath}".`,
          "",
          "2. Classify drifts by severity:",
          "   - **CRITICAL**: missing or wrong framework version, major tech missing (ORM, auth, CSS), wrong router detected",
          "   - **MINOR**: missing utility library, minor version difference, new devDependency not documented",
          "",
          "3. Present results clearly with this classification.",
          "",
          "4. If CRITICAL drifts exist → strongly recommend running update-project.",
          "   If only MINOR drifts → indicate update is optional.",
          "   If no drifts → confirm CLAUDE.md is up to date.",
        ];

    return {
      messages: [{
        role: "user" as const,
        content: { type: "text" as const, text: steps.join("\n") },
      }],
    };
  }
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
