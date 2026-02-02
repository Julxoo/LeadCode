import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { IGNORE_DIRS as IGNORE, SOURCE_EXTS } from "./constants.js";

export type NamingStyle = "kebab-case" | "camelCase" | "PascalCase" | "snake_case" | "mixed";

export interface CodePatterns {
  useClientCount: number;
  useServerCount: number;
  totalComponents: number;
  clientRatio: number;
  hasBarrelFiles: boolean;
  usesPathAlias: boolean;
  largeFiles: string[];
  consoleLogCount: number;
  // Auto-detected conventions
  fileNamingStyle: NamingStyle;
  hasReactFiles: boolean;
  importOrder: string[] | null;
  indentation: { style: "spaces" | "tabs"; size?: number } | null;
  quoteStyle: "single" | "double" | "mixed" | null;
}

/** Internal counters used during scan */
interface ScanCounters {
  namingCounts: Record<string, number>;
  singleQuotes: number;
  doubleQuotes: number;
  tabIndents: number;
  spaceIndents: number;
  spaceSizes: number[];
  importOrderSamples: ImportCategory[][];
}

type ImportCategory = "builtin" | "external" | "alias" | "relative" | "type";

const NODE_BUILTINS = new Set([
  "assert", "buffer", "child_process", "cluster", "crypto", "dgram", "dns",
  "events", "fs", "http", "http2", "https", "net", "os", "path", "perf_hooks",
  "process", "querystring", "readline", "stream", "string_decoder", "timers",
  "tls", "tty", "url", "util", "v8", "vm", "worker_threads", "zlib",
]);

function classifyFileName(name: string): string {
  const stem = name.replace(/\.[^.]+$/, "");
  // Skip index files — not meaningful for naming style
  if (stem === "index") return "";
  if (/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(stem)) return "kebab-case";
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(stem)) return "snake_case";
  if (/^[A-Z][a-zA-Z0-9]*$/.test(stem)) return "PascalCase";
  if (/^[a-z][a-zA-Z0-9]*$/.test(stem)) return "camelCase";
  return "";
}

function classifyImport(specifier: string): ImportCategory {
  if (specifier.startsWith("node:")) return "builtin";
  if (NODE_BUILTINS.has(specifier.split("/")[0])) return "builtin";
  if (specifier.startsWith("@/") || specifier.startsWith("~/")) return "alias";
  if (specifier.startsWith(".")) return "relative";
  return "external";
}

function extractImportOrder(content: string): ImportCategory[] | null {
  const importRegex = /^(import\s+type\s+.*?from\s+|import\s+.*?from\s+)(['"])(.*?)\2/gm;
  const categories: ImportCategory[] = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const isTypeImport = match[1].startsWith("import type");
    const specifier = match[3];
    if (isTypeImport) {
      categories.push("type");
    } else {
      categories.push(classifyImport(specifier));
    }
  }

  if (categories.length < 3) return null;

  // Deduplicate consecutive same categories to get the order pattern
  const order: ImportCategory[] = [];
  for (const cat of categories) {
    if (order[order.length - 1] !== cat) {
      order.push(cat);
    }
  }
  return order;
}

function detectIndentation(content: string): { style: "spaces" | "tabs"; size?: number } | null {
  const lines = content.split("\n").slice(0, 50);
  let tabs = 0;
  let spaces = 0;
  let spaceSize = 0;

  for (const line of lines) {
    if (line.startsWith("\t")) tabs++;
    else if (line.startsWith("  ")) {
      spaces++;
      const indent = line.match(/^( +)/);
      if (indent && spaceSize === 0) spaceSize = indent[1].length;
    }
  }

  if (tabs === 0 && spaces === 0) return null;
  if (tabs > spaces) return { style: "tabs" };
  const size = spaceSize <= 2 ? 2 : 4;
  return { style: "spaces", size };
}

async function scanDir(
  dir: string,
  patterns: CodePatterns,
  counters: ScanCounters,
  maxDepth = 6
): Promise<void> {
  if (maxDepth <= 0) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  // Collect subdirectories for parallel scan
  const subdirs: string[] = [];
  for (const entry of entries) {
    if (IGNORE.has(entry.name) || entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      subdirs.push(join(dir, entry.name));
      continue;
    }

    const ext = entry.name.split(".").pop() ?? "";
    if (!SOURCE_EXTS.has(ext)) continue;

    // File naming classification
    const style = classifyFileName(entry.name);
    if (style) {
      counters.namingCounts[style] = (counters.namingCounts[style] ?? 0) + 1;
    }

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

    // Check for 'use client' / 'use server' in first 5 non-empty lines
    const firstLines = lines.slice(0, 5).join("\n");
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

    // Console.log count (exclude commented lines)
    for (const line of lines) {
      const trimmed = line.trimStart();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
      const consoleMatches = trimmed.match(/console\.log\(/g);
      if (consoleMatches) patterns.consoleLogCount += consoleMatches.length;
    }

    // Quote style from imports
    const singleQ = (content.match(/from\s+'/g) ?? []).length;
    const doubleQ = (content.match(/from\s+"/g) ?? []).length;
    counters.singleQuotes += singleQ;
    counters.doubleQuotes += doubleQ;

    // Indentation sample (first 20 files with indentation)
    if (counters.tabIndents + counters.spaceIndents < 20) {
      const indent = detectIndentation(content);
      if (indent) {
        if (indent.style === "tabs") counters.tabIndents++;
        else {
          counters.spaceIndents++;
          if (indent.size) counters.spaceSizes.push(indent.size);
        }
      }
    }

    // Import order sample (first 30 files with imports)
    if (counters.importOrderSamples.length < 30) {
      const order = extractImportOrder(content);
      if (order) counters.importOrderSamples.push(order);
    }
  }

  // Parallel subdirectory scan
  if (subdirs.length > 0) {
    await Promise.all(subdirs.map(sub => scanDir(sub, patterns, counters, maxDepth - 1)));
  }
}

const IMPORT_CATEGORY_LABELS: Record<ImportCategory, string> = {
  builtin: "Node builtins",
  external: "external packages",
  alias: "internal aliases (@/)",
  relative: "relative imports",
  type: "type imports",
};

function resolveImportOrder(samples: ImportCategory[][]): string[] | null {
  if (samples.length < 3) return null;

  // Count how often each category appears at each position
  const positionCounts: Record<ImportCategory, number[]> = {
    builtin: [], external: [], alias: [], relative: [], type: [],
  };

  for (const sample of samples) {
    for (let i = 0; i < sample.length; i++) {
      const cat = sample[i];
      if (!positionCounts[cat][i]) positionCounts[cat][i] = 0;
      positionCounts[cat][i]++;
    }
  }

  // Find the most common categories (present in >20% of samples)
  const threshold = samples.length * 0.2;
  const presentCategories = (Object.keys(positionCounts) as ImportCategory[]).filter(
    cat => positionCounts[cat].reduce((a, b) => a + b, 0) > threshold
  );

  // Sort by average position
  const avgPos = (cat: ImportCategory): number => {
    const counts = positionCounts[cat];
    let total = 0, weight = 0;
    for (let i = 0; i < counts.length; i++) {
      if (counts[i]) { total += i * counts[i]; weight += counts[i]; }
    }
    return weight > 0 ? total / weight : 999;
  };

  presentCategories.sort((a, b) => avgPos(a) - avgPos(b));

  if (presentCategories.length < 2) return null;
  return presentCategories.map(c => IMPORT_CATEGORY_LABELS[c]);
}

function resolveNamingStyle(counts: Record<string, number>): NamingStyle {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return "mixed";

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topStyle, topCount] = sorted[0];
  if (topCount / total >= 0.6) return topStyle as NamingStyle;
  return "mixed";
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
    fileNamingStyle: "mixed",
    hasReactFiles: false,
    importOrder: null,
    indentation: null,
    quoteStyle: null,
  };

  const counters: ScanCounters = {
    namingCounts: {},
    singleQuotes: 0,
    doubleQuotes: 0,
    tabIndents: 0,
    spaceIndents: 0,
    spaceSizes: [],
    importOrderSamples: [],
  };

  await scanDir(projectPath, patterns, counters);

  // Derive computed fields
  patterns.clientRatio =
    patterns.totalComponents > 0
      ? patterns.useClientCount / patterns.totalComponents
      : 0;

  patterns.hasReactFiles = patterns.totalComponents > 0;
  patterns.fileNamingStyle = resolveNamingStyle(counters.namingCounts);
  patterns.importOrder = resolveImportOrder(counters.importOrderSamples);

  // Quote style
  const totalQuotes = counters.singleQuotes + counters.doubleQuotes;
  if (totalQuotes > 0) {
    const singleRatio = counters.singleQuotes / totalQuotes;
    if (singleRatio > 0.8) patterns.quoteStyle = "single";
    else if (singleRatio < 0.2) patterns.quoteStyle = "double";
    else patterns.quoteStyle = "mixed";
  }

  // Indentation
  const totalIndent = counters.tabIndents + counters.spaceIndents;
  if (totalIndent > 0) {
    if (counters.tabIndents > counters.spaceIndents) {
      patterns.indentation = { style: "tabs" };
    } else {
      const avgSize = counters.spaceSizes.length > 0
        ? Math.round(counters.spaceSizes.reduce((a, b) => a + b, 0) / counters.spaceSizes.length)
        : 2;
      patterns.indentation = { style: "spaces", size: avgSize <= 2 ? 2 : 4 };
    }
  }

  return patterns;
}
