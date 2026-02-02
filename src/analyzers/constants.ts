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
