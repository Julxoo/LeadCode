import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { analyzeDependencies } from "../analyzers/dependencies.js";
import { analyzeStructure } from "../analyzers/structure.js";
import { detectFramework, detectStack } from "../analyzers/detection.js";

interface Drift {
  type: "missing" | "outdated";
  section: string;
  message: string;
}

export function registerValidateClaudeMd(server: McpServer): void {
  server.registerTool(
    "validate-claude-md",
    {
      title: "Validate CLAUDE.md",
      description:
        "Checks if an existing CLAUDE.md is still in sync with the actual project. Detects drifts: missing technologies, outdated versions.",
      inputSchema: {
        projectPath: z
          .string()
          .describe("Absolute path to the project root directory"),
      },
    },
    async ({ projectPath }) => {
      try {
        const claudeMdPath = join(projectPath, "CLAUDE.md");
        try {
          await stat(claudeMdPath);
        } catch {
          return {
            isError: true,
            content: [{ type: "text" as const, text: `No CLAUDE.md found at ${claudeMdPath}. Use generate-claude-md first.` }],
          };
        }

        const claudeMd = await readFile(claudeMdPath, "utf-8");

        // Re-analyze the project
        const pkg = await analyzeDependencies(projectPath);
        const structure = await analyzeStructure(projectPath);
        const framework = detectFramework(pkg.dependencies, pkg.devDependencies, structure);
        const detected = detectStack(pkg.dependencies, pkg.devDependencies);
        detected.runtime = structure.detectedRuntime;

        const drifts: Drift[] = [];

        // Check framework version
        if (framework) {
          if (!claudeMd.includes(framework.version)) {
            drifts.push({
              type: "outdated",
              section: "Stack",
              message: `Framework version ${framework.version} not found in CLAUDE.md. Version may have been updated.`,
            });
          }
        }

        // Check for new techs not mentioned
        const techFields: [string, string | null][] = [
          ["ORM", detected.orm],
          ["Auth", detected.auth],
          ["Validation", detected.validation],
          ["CSS", detected.css],
          ["Testing", detected.testing],
          ["i18n", detected.i18n],
          ["Payments", detected.payments],
          ["State Management", detected.stateManagement],
          ["Data Fetching", detected.dataFetching],
          ["Form Library", detected.formLibrary],
          ["UI Components", detected.uiComponents],
          ["Database", detected.database],
          ["Email", detected.email],
          ["Realtime", detected.realtime],
          ["CMS", detected.cms],
          ["Jobs", detected.jobs],
        ];

        for (const [label, value] of techFields) {
          if (value && !claudeMd.toLowerCase().includes(value.toLowerCase())) {
            drifts.push({
              type: "missing",
              section: "Stack",
              message: `${label}: ${value} is in the project but not mentioned in CLAUDE.md.`,
            });
          }
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  valid: drifts.length === 0,
                  drifts,
                  total: drifts.length,
                  summary: drifts.length === 0
                    ? "CLAUDE.md is in sync with the project."
                    : `Found ${drifts.length} drift(s). Consider running setup-project again to regenerate.`,
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
          content: [{ type: "text" as const, text: `validate-claude-md failed: ${message}` }],
        };
      }
    }
  );
}
