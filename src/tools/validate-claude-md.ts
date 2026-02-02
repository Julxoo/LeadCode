import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { analyzeStructure } from "../analyzers/structure.js";
import { detectEcosystem, getEcosystemAdapter } from "../analyzers/ecosystem.js";

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
        "Check if an existing CLAUDE.md is still up to date with the project. Detects drifts like missing technologies or outdated versions.",
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
        const claudeMdLower = claudeMd.toLowerCase();

        // Detect ecosystem and get adapter
        let ecosystemDetection;
        try {
          ecosystemDetection = await detectEcosystem(projectPath);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: "text" as const, text: message }],
          };
        }

        let adapter;
        try {
          adapter = getEcosystemAdapter(ecosystemDetection.ecosystem);
        } catch {
          return {
            isError: true,
            content: [{
              type: "text" as const,
              text: `Detected ecosystem: ${ecosystemDetection.ecosystem}. Currently supported: JavaScript, Python, Rust, Go, Java, PHP.`,
            }],
          };
        }

        const pkg = await adapter.parseDependencies(projectPath);
        const structure = await analyzeStructure(projectPath, ecosystemDetection.ecosystem);
        const framework = adapter.detectFramework(pkg.dependencies, pkg.devDependencies, structure);
        const detected = adapter.detectStack(pkg.dependencies, pkg.devDependencies, structure);

        const drifts: Drift[] = [];

        // Check framework version
        if (framework) {
          if (!claudeMd.includes(framework.version)) {
            drifts.push({
              type: "outdated",
              section: "Framework",
              message: `Framework version ${framework.version} not found in CLAUDE.md. Version may have been updated.`,
            });
          }
        }

        // Check all recognized techs dynamically
        for (const [, tech] of Object.entries(detected.recognized)) {
          if (!claudeMdLower.includes(tech.name.toLowerCase())) {
            drifts.push({
              type: "missing",
              section: tech.category,
              message: `${tech.name} (${tech.category}) is in the project but not mentioned in CLAUDE.md.`,
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
                    : `Found ${drifts.length} drift(s). Consider running update-project to regenerate.`,
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
