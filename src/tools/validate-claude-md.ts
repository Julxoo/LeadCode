import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { analyzeDependencies } from "../analyzers/dependencies.js";
import { analyzeStructure } from "../analyzers/structure.js";
import { detectFramework, detectStack } from "../analyzers/detection.js";
import {
  getConventions,
  getInterdictions,
  getActiveCrossRefs,
  detectGaps,
} from "../rules/index.js";
import type { RepoAnalysis } from "../types.js";

interface Drift {
  type: "missing" | "outdated" | "extra";
  section: string;
  message: string;
}

export function registerValidateClaudeMd(server: McpServer): void {
  server.registerTool(
    "validate-claude-md",
    {
      title: "Validate CLAUDE.md",
      description:
        "Checks if an existing CLAUDE.md is still in sync with the actual project. Detects drifts: missing conventions, outdated stack info, new gaps not covered.",
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

        const analysis: RepoAnalysis = {
          projectPath,
          projectName: pkg.name,
          framework,
          dependencies: pkg.dependencies,
          devDependencies: pkg.devDependencies,
          scripts: pkg.scripts,
          structure,
          detected,
        };

        const drifts: Drift[] = [];

        // Check framework version
        if (framework) {
          const versionInDoc = claudeMd.includes(framework.version);
          if (!versionInDoc) {
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
          ["UI Components", detected.uiComponents],
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

        // Check for conventions not present
        const conventions = getConventions(analysis);
        for (const conv of conventions) {
          if (!claudeMd.includes(conv.id) && !claudeMd.includes(conv.description)) {
            drifts.push({
              type: "missing",
              section: "Conventions",
              message: `Convention "${conv.description}" is applicable but not in CLAUDE.md.`,
            });
          }
        }

        // Check for cross-refs
        const crossRefs = getActiveCrossRefs(analysis);
        for (const cr of crossRefs) {
          const combo = cr.techs.join(" + ");
          if (!claudeMd.includes(combo)) {
            drifts.push({
              type: "missing",
              section: "Cross-Stack Rules",
              message: `Cross-stack rule for ${combo} is applicable but not in CLAUDE.md.`,
            });
          }
        }

        // Check for gaps
        const gaps = detectGaps(analysis);
        const highGaps = gaps.filter((g) => g.severity === "high");
        for (const gap of highGaps) {
          drifts.push({
            type: "missing",
            section: "Gaps",
            message: `High-severity gap still exists: ${gap.message}`,
          });
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
                    : `Found ${drifts.length} drift(s). Consider running generate-claude-md to update.`,
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
