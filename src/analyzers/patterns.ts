import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { IGNORE_DIRS as IGNORE, SOURCE_EXTS } from "./constants.js";

export interface CodePatterns {
  useClientCount: number;
  useServerCount: number;
  totalComponents: number;
  clientRatio: number; // 0-1 ratio of 'use client' files
  hasBarrelFiles: boolean; // index.ts that re-exports
  usesPathAlias: boolean; // @/ or ~/ imports
  largeFiles: string[]; // files > 300 lines
  consoleLogCount: number;
}

async function scanDir(
  dir: string,
  patterns: CodePatterns,
  maxDepth = 6
): Promise<void> {
  if (maxDepth <= 0) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (IGNORE.has(entry.name) || entry.name.startsWith(".")) continue;

    if (entry.isDirectory()) {
      await scanDir(join(dir, entry.name), patterns, maxDepth - 1);
      continue;
    }

    const ext = entry.name.split(".").pop() ?? "";
    if (!SOURCE_EXTS.has(ext)) continue;

    const filePath = join(dir, entry.name);
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      continue;
    }

    const lines = content.split("\n");

    if (ext === "tsx" || ext === "jsx") {
      patterns.totalComponents++;
    }

    // Check for 'use client' / 'use server'
    const firstLines = content.slice(0, 200);
    if (firstLines.includes("'use client'") || firstLines.includes('"use client"')) {
      patterns.useClientCount++;
    }
    if (firstLines.includes("'use server'") || firstLines.includes('"use server"')) {
      patterns.useServerCount++;
    }

    // Barrel files
    if (entry.name === "index.ts" || entry.name === "index.js") {
      if (content.includes("export {") || content.includes("export *")) {
        patterns.hasBarrelFiles = true;
      }
    }

    // Path alias
    if (content.includes("from '@/") || content.includes("from \"@/") ||
        content.includes("from '~/") || content.includes("from \"~/")) {
      patterns.usesPathAlias = true;
    }

    // Large files
    if (lines.length > 300) {
      patterns.largeFiles.push(filePath);
    }

    // Console.log count
    const matches = content.match(/console\.log\(/g);
    if (matches) {
      patterns.consoleLogCount += matches.length;
    }
  }
}

export async function analyzePatterns(projectPath: string): Promise<CodePatterns> {
  const patterns: CodePatterns = {
    useClientCount: 0,
    useServerCount: 0,
    totalComponents: 0,
    clientRatio: 0,
    hasBarrelFiles: false,
    usesPathAlias: false,
    largeFiles: [],
    consoleLogCount: 0,
  };

  await scanDir(projectPath, patterns);

  patterns.clientRatio =
    patterns.totalComponents > 0
      ? patterns.useClientCount / patterns.totalComponents
      : 0;

  return patterns;
}
