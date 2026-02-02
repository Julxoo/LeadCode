import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { analyzeDependencies } from "../analyzers/dependencies.js";
import { analyzeStructure } from "../analyzers/structure.js";
import { detectFramework, detectStack } from "../analyzers/detection.js";
import type { RepoAnalysis } from "../types.js";

export function registerAnalyzeRepo(server: McpServer): void {
  server.registerTool(
    "analyze-repo",
    {
      title: "Analyze Repository",
      description: [
        "Scan and analyze a project to detect its full tech stack, directory structure, scripts, and dependencies.",
        "Returns recognized technologies with versions and categories, plus all unrecognized dependencies for further analysis.",
        "",
        "IMPORTANT: This is step 1 of the full workflow. After calling this tool, you MUST:",
        "1. Use the setup-project prompt (preferred) OR follow the full workflow manually:",
        "2. For EACH recognized tech + relevant unrecognized dep: call resolve-library-id then query-docs (Context7)",
        "3. For EACH tech: WebSearch '{tech} {version} best practices {current_year}'",
        "4. Synthesize 3-5 actionable rules per tech",
        "5. Produce cross-stack conventions for tech pairs that interact",
        "6. Call generate-claude-md with analysis + docs JSON",
        "",
        "Do NOT call generate-claude-md directly without docs — the result will be an empty skeleton.",
      ].join("\n"),
      inputSchema: {
        projectPath: z
          .string()
          .describe("Absolute path to the project root directory"),
      },
    },
    async ({ projectPath }) => {
      try {
        try {
          await stat(projectPath);
        } catch {
          return {
            isError: true,
            content: [{ type: "text" as const, text: `Directory not found: ${projectPath}` }],
          };
        }

        try {
          await stat(join(projectPath, "package.json"));
        } catch {
          return {
            isError: true,
            content: [{ type: "text" as const, text: `No package.json found in ${projectPath}. LeadCode requires a Node.js project.` }],
          };
        }

        const pkg = await analyzeDependencies(projectPath);
        const structure = await analyzeStructure(projectPath);
        const framework = detectFramework(pkg.dependencies, pkg.devDependencies, structure);
        const detected = detectStack(pkg.dependencies, pkg.devDependencies, structure);

        const analysis: RepoAnalysis = {
          projectPath,
          projectName: pkg.name,
          framework,
          dependencies: pkg.dependencies,
          devDependencies: pkg.devDependencies,
          peerDependencies: pkg.peerDependencies,
          scripts: pkg.scripts,
          engines: pkg.engines,
          packageManager: pkg.packageManager,
          workspaces: pkg.workspaces,
          structure,
          detected,
        };

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(analysis, null, 2) },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: "text" as const, text: `analyze-repo failed: ${message}` }],
        };
      }
    }
  );
}
