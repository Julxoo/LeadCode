import type { Rule } from "../types.js";

export const validationRules: Rule = {
  id: "validation",
  name: "Input Validation",
  applies: (a) => a.detected.validation !== null,
  gaps: [
    {
      category: "shared-schemas",
      severity: "medium",
      check: (a) => !a.structure.hasSchemasDir,
      message: "No shared schemas directory found",
      details:
        "Without a dedicated directory for validation schemas, Claude will duplicate them across files. Create a /schemas or /lib/schemas directory.",
    },
  ],
  conventions: [
    {
      id: "validation-shared",
      description: "Shared validation schemas",
      rule: "Define validation schemas in a shared location (lib/schemas/ or schemas/). Import them in both API routes and forms.",
    },
    {
      id: "validation-api-boundary",
      description: "Validate at API boundaries",
      rule: "Every API route must validate its input using the schema library. Parse, don't validate: use schema.parse() to get typed output.",
    },
    {
      id: "validation-error-messages",
      description: "User-friendly error messages",
      rule: "Customize validation error messages for user-facing forms. Use schema library's message customization.",
    },
  ],
  interdictions: [
    "NEVER validate manually with if/else when a schema library is available.",
    "NEVER duplicate schema definitions — import from the shared location.",
    "NEVER trust TypeScript types alone for runtime safety — types are erased at runtime.",
  ],
  crossRefs: [],
};
