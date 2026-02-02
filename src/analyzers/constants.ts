import type { Ecosystem } from "./ecosystem.js";

// ---------------------------------------------------------------------------
// Legacy constants (kept for backward compatibility — used by existing code)
// ---------------------------------------------------------------------------

export const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".vercel",
  "dist",
  "build",
  ".turbo",
  "coverage",
  ".cache",
  ".output",
  ".nuxt",
  ".astro",
  ".svelte-kit",
  ".parcel-cache",
  "storybook-static",
  ".storybook",
]);

export const SOURCE_EXTS = new Set([
  "ts", "tsx", "js", "jsx",
  "mts", "mjs", "cjs",
  "svelte", "vue", "astro",
]);

// ---------------------------------------------------------------------------
// Common ignore dirs (shared across all ecosystems)
// ---------------------------------------------------------------------------

export const COMMON_IGNORE_DIRS = new Set([
  ".git",
  "dist",
  "build",
  "coverage",
  ".cache",
]);

// ---------------------------------------------------------------------------
// Per-ecosystem patterns
// ---------------------------------------------------------------------------

export const ECOSYSTEM_PATTERNS: Record<Ecosystem, {
  ignoreDirs: Set<string>;
  sourceExtensions: Set<string>;
}> = {
  javascript: {
    ignoreDirs: new Set([
      "node_modules",
      ".next",
      ".vercel",
      ".turbo",
      ".output",
      ".nuxt",
      ".astro",
      ".svelte-kit",
      ".parcel-cache",
      "storybook-static",
      ".storybook",
    ]),
    sourceExtensions: new Set([
      "ts", "tsx", "js", "jsx",
      "mts", "mjs", "cjs",
      "svelte", "vue", "astro",
    ]),
  },

  python: {
    ignoreDirs: new Set([
      "__pycache__",
      ".venv",
      "venv",
      "env",
      ".pytest_cache",
      ".mypy_cache",
      ".ruff_cache",
      ".tox",
      "htmlcov",
      ".coverage",
      "site-packages",
      ".eggs",
    ]),
    sourceExtensions: new Set(["py", "pyi", "pyx"]),
  },

  rust: {
    ignoreDirs: new Set(["target", ".cargo"]),
    sourceExtensions: new Set(["rs"]),
  },

  go: {
    ignoreDirs: new Set(["vendor"]),
    sourceExtensions: new Set(["go"]),
  },

  java: {
    ignoreDirs: new Set(["target", ".gradle", ".idea", "out"]),
    sourceExtensions: new Set(["java", "kt", "kts", "groovy", "scala"]),
  },

  php: {
    ignoreDirs: new Set(["vendor", "storage", "node_modules", "public/build", "public/hot"]),
    sourceExtensions: new Set(["php"]),
  },

  ruby: {
    ignoreDirs: new Set(["vendor/bundle", "tmp", "log"]),
    sourceExtensions: new Set(["rb", "erb", "rake", "gemspec"]),
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getIgnoreDirs(ecosystem: Ecosystem): Set<string> {
  const ecosystemDirs = ECOSYSTEM_PATTERNS[ecosystem].ignoreDirs;
  return new Set([...COMMON_IGNORE_DIRS, ...ecosystemDirs]);
}

export function getSourceExtensions(ecosystem: Ecosystem): Set<string> {
  return ECOSYSTEM_PATTERNS[ecosystem].sourceExtensions;
}
