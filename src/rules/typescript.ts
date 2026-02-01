import type { Rule } from "../types.js";

export const typescriptRules: Rule = {
  id: "typescript",
  name: "TypeScript",
  applies: (a) => a.structure.hasTsConfig,
  gaps: [
    {
      category: "types-dir",
      severity: "low",
      check: (a) => !a.structure.hasTypesDir && a.structure.approximateFileCount > 20,
      message: "No shared types directory detected",
      details:
        "For projects with 20+ files, a dedicated types/ directory helps Claude find and reuse type definitions.",
    },
  ],
  conventions: [
    {
      id: "ts-strict",
      description: "Strict TypeScript",
      rule: "Enable strict mode in tsconfig.json. Never use `any` unless justified with a comment explaining why.",
    },
    {
      id: "ts-explicit-returns",
      description: "Explicit return types on exports",
      rule: "All exported functions must have explicit return types. Internal functions can use inference.",
    },
    {
      id: "ts-no-enums",
      description: "Prefer unions over enums",
      rule: "Use string union types (`type Status = 'active' | 'inactive'`) instead of enums. Use `as const` satisfies for object maps.",
    },
    {
      id: "ts-discriminated-unions",
      description: "Discriminated unions for state",
      rule: "Model loading/success/error states with discriminated unions: `{ status: 'loading' } | { status: 'success', data: T } | { status: 'error', error: string }`.",
    },
    {
      id: "ts-import-types",
      description: "Type-only imports",
      rule: "Use `import type { Foo }` for type-only imports. This improves tree-shaking and makes intent clear.",
    },
    {
      id: "ts-no-non-null",
      description: "No non-null assertions",
      rule: "Avoid the non-null assertion operator (!). Handle null/undefined cases explicitly with narrowing, optional chaining, or nullish coalescing.",
    },
  ],
  interdictions: [
    "NEVER use `// @ts-ignore` — use `// @ts-expect-error` with an explanation of why the suppression is needed.",
    "NEVER use `any` in exported function signatures without a comment justifying it.",
    "NEVER use `as` type casts to silence type errors — fix the underlying type instead.",
    "NEVER use `Object`, `Function`, or `{}` as types — use specific types or `unknown`.",
  ],
  crossRefs: [],
};
