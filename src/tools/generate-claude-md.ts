import { writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { generateClaudeMd } from "../templates/claude-md.js";
import { analyzePatterns } from "../analyzers/patterns.js";
import type { RepoAnalysis, FetchedDocs } from "../types.js";

export function registerGenerateClaudeMd(server: McpServer): void {
  server.registerTool(
    "generate-claude-md",
    {
      title: "Generate CLAUDE.md",
      description: [
        "Generate a CLAUDE.md file for a project.",
        "",
        "IMPORTANT: Before calling this tool, you MUST follow this workflow:",
        "",
        "## Step 1: Analyze",
        "Call analyze-repo to get the project analysis.",
        "",
        "## Step 2: Read tech-queries",
        "Read the LeadCode resource 'leadcode://tech-queries' to get the mapping of detected techs to Context7 library names and queries.",
        "",
        "## Step 3: Context7 — Official documentation",
        "For each detected technology that has a mapping in tech-queries:",
        "  a) Call Context7 resolve-library-id with the libraryName and query.",
        "  b) Call Context7 query-docs with the resolved ID and the queries.",
        "  c) Synthesize the raw docs into 3-5 concise actionable rules per tech (conventions, patterns, gotchas — NO full code blocks).",
        "",
        "## Step 4: WebSearch — Best practices, architecture & gotchas",
        "For each detected technology, use WebSearch to complement Context7 with real-world knowledge:",
        "  a) Search '{tech} {version} best practices architecture {current_year}' for each major tech (framework, ORM, CSS, etc.).",
        "  b) Search '{tech} {version} breaking changes migration' if the detected version is recent.",
        "  c) Search the full stack combination '{tech1} {tech2} {tech3} project architecture best practices' for holistic patterns.",
        "Incorporate the results into both per-tech rules (techDocs) and cross-stack rules (crossDocs).",
        "Focus on: project structure, architecture patterns, performance tips, security gotchas, and community conventions NOT covered by official docs.",
        "",
        "## Step 5: Unified cross-stack conventions",
        "Using ALL Context7 docs + WebSearch results + crossQueries from tech-queries, produce ONE unified set of cross-stack rules.",
        "These rules describe how ALL detected technologies work together as a whole (not pairwise).",
        "Think in terms of real workflows: 'When creating a form, use shadcn components + Zod validation + Server Action + i18n error messages'.",
        "Focus on rules that span multiple techs simultaneously. Put this in crossDocs under key 'all'.",
        "",
        "## Step 6: Build docs JSON",
        "{ \"techDocs\": { \"next\": \"- rule 1\\n- rule 2\", ... }, \"crossDocs\": { \"all\": \"- cross rule 1\\n- cross rule 2\\n...\" } }",
        "",
        "## Step 7: Generate",
        "Call this tool with analysis + docs.",
        "",
        "If Context7 is not available, use WebSearch only. If neither is available, call this tool without docs.",
      ].join("\n"),
      inputSchema: {
        analysis: z
          .string()
          .describe("JSON string of RepoAnalysis (output of analyze-repo)"),
        docs: z
          .string()
          .optional()
          .describe(
            'JSON string of synthesized documentation: { "techDocs": Record<string, string>, "crossDocs": Record<string, string> }. Each value should be concise, actionable rules (not raw code snippets). If omitted, CLAUDE.md is generated without technology documentation.'
          ),
        choices: z
          .string()
          .optional()
          .describe(
            "JSON string of user choices: Record<string, string> mapping topic to chosen option. Optional."
          ),
      },
    },
    async ({ analysis: analysisStr, docs: docsStr, choices: choicesStr }) => {
      try {
        const analysis: RepoAnalysis = JSON.parse(analysisStr);
        const choices: Record<string, string> = choicesStr
          ? JSON.parse(choicesStr)
          : {};

        const docs: FetchedDocs = docsStr
          ? JSON.parse(docsStr)
          : { techDocs: {}, crossDocs: {}, metadata: { techCount: 0, snippetCount: 0, failedTechs: [] } };

        // Ensure metadata exists
        if (!docs.metadata) {
          docs.metadata = {
            techCount: Object.keys(docs.techDocs ?? {}).length,
            snippetCount: Object.keys(docs.techDocs ?? {}).length + Object.keys(docs.crossDocs ?? {}).length,
            failedTechs: [],
          };
        }

        // Verify project path still exists
        try {
          await stat(analysis.projectPath);
        } catch {
          return {
            isError: true,
            content: [{ type: "text" as const, text: `Project directory not found: ${analysis.projectPath}` }],
          };
        }

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
