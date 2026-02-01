import type { Rule } from "../types.js";

export const drizzleRules: Rule = {
  id: "drizzle",
  name: "Drizzle ORM",
  applies: (a) => a.detected.orm === "drizzle",
  gaps: [
    {
      category: "drizzle-schema-org",
      severity: "medium",
      check: (a) => !a.structure.hasSchemasDir && !a.structure.hasLibDir,
      message: "No clear schema organization detected for Drizzle",
      details:
        "Drizzle schemas should live in a dedicated directory (e.g., db/schema/ or lib/db/). Without this, Claude will place schema files inconsistently.",
    },
  ],
  conventions: [
    {
      id: "drizzle-schema-files",
      description: "Schema file organization",
      rule: "Keep Drizzle schema definitions in db/schema/ with one file per domain entity. Export all from db/schema/index.ts.",
    },
    {
      id: "drizzle-prepared",
      description: "Prepared statements for hot paths",
      rule: "Use db.query.*.findFirst/findMany with prepared statements (`.prepare()`) for frequently-called queries.",
    },
    {
      id: "drizzle-migrations",
      description: "Migration workflow",
      rule: "Generate migrations with `drizzle-kit generate`. Apply with `drizzle-kit migrate`. Never modify generated migration files.",
    },
    {
      id: "drizzle-relations",
      description: "Define relations explicitly",
      rule: "Define relations using the `relations()` helper alongside table definitions. This enables the relational query API.",
    },
  ],
  interdictions: [
    "NEVER modify generated migration files — always generate a new migration instead.",
    "NEVER use raw SQL when the Drizzle query builder can express the query.",
    "NEVER import the database client in client-side code.",
  ],
  crossRefs: [],
};
