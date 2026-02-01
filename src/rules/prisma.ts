import type { Rule } from "../types.js";

export const prismaRules: Rule = {
  id: "prisma",
  name: "Prisma",
  applies: (a) => a.detected.orm === "prisma",
  gaps: [
    {
      category: "prisma-client-singleton",
      severity: "high",
      check: (a) => !a.structure.hasLibDir && !a.structure.hasUtilsDir,
      message: "Verify Prisma client is instantiated as a singleton",
      details:
        "In dev, Next.js hot-reload creates multiple Prisma clients. Use a singleton pattern in lib/prisma.ts or db.ts.",
    },
  ],
  conventions: [
    {
      id: "prisma-singleton",
      description: "Prisma client singleton",
      rule: "Instantiate PrismaClient once in lib/prisma.ts (or lib/db.ts). Re-export from there. Never create new PrismaClient() elsewhere.",
    },
    {
      id: "prisma-select",
      description: "Select only needed fields",
      rule: "Use select or include explicitly. Avoid fetching entire records when only a few fields are needed.",
    },
    {
      id: "prisma-transactions",
      description: "Use transactions for multi-step writes",
      rule: "Use prisma.$transaction() for operations that must succeed or fail together.",
    },
    {
      id: "prisma-migrations",
      description: "Migration discipline",
      rule: "Always use 'prisma migrate dev' for schema changes. Never modify the database directly.",
    },
  ],
  interdictions: [
    "NEVER use raw SQL unless Prisma's query API cannot express the query.",
    "NEVER call Prisma in Client Components or client-side code.",
    "NEVER use prisma.$connect() manually — Prisma handles connections automatically.",
    "NEVER store the Prisma client in global scope without the singleton pattern.",
  ],
  crossRefs: [],
};
