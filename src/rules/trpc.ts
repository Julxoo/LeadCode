import type { Rule } from "../types.js";

export const trpcRules: Rule = {
  id: "trpc",
  name: "tRPC",
  applies: (a) => a.detected.apiStyle === "trpc",
  gaps: [],
  conventions: [
    {
      id: "trpc-router-org",
      description: "Router organization",
      rule: "Create one router file per domain (userRouter, postRouter, etc.). Merge them in a root appRouter. Keep router files in server/routers/ or lib/trpc/routers/.",
    },
    {
      id: "trpc-middleware",
      description: "Auth middleware",
      rule: "Create a protectedProcedure that validates auth. Use it for all authenticated endpoints. Never check auth inside individual procedures.",
    },
    {
      id: "trpc-input-validation",
      description: "Input validation with Zod",
      rule: "Always define .input() with a Zod schema for every procedure that accepts arguments. Share schemas between client and server.",
    },
    {
      id: "trpc-error-handling",
      description: "Structured errors",
      rule: "Use TRPCError with appropriate codes (NOT_FOUND, UNAUTHORIZED, BAD_REQUEST). Never throw generic Error objects.",
    },
  ],
  interdictions: [
    "NEVER use fetch() to call your own tRPC API — use the tRPC client.",
    "NEVER put business logic in router files — call service functions.",
    "NEVER expose internal error details to the client — use TRPCError with safe messages.",
  ],
  crossRefs: [],
};
