import type { Rule } from "../types.js";

export const authRules: Rule = {
  id: "auth",
  name: "Authentication",
  applies: (a) => a.detected.auth !== null,
  gaps: [
    {
      category: "auth-middleware",
      severity: "high",
      check: (a) =>
        a.framework?.name === "next" &&
        a.framework.variant === "app-router" &&
        !a.structure.hasMiddleware,
      message: "No middleware.ts detected for route protection",
      details:
        "Next.js App Router should use middleware.ts for authentication checks on protected routes.",
    },
    {
      category: "auth-session",
      severity: "medium",
      check: (a) => !a.structure.hasLibDir && !a.structure.hasUtilsDir,
      message: "No centralized auth utility detected (e.g., lib/auth.ts)",
      details:
        "Every protected Server Component and API route must validate the session server-side. Never rely on client-side auth state alone.",
    },
  ],
  conventions: [
    {
      id: "auth-server-check",
      description: "Server-side auth checks",
      rule: "Always validate authentication on the server (middleware, Server Components, API routes). Client-side checks are for UX only, not security.",
    },
    {
      id: "auth-centralized",
      description: "Centralized auth utilities",
      rule: "Create a single auth utility (e.g., lib/auth.ts) that exports getCurrentUser(), requireAuth(), etc. All auth checks go through this module.",
    },
    {
      id: "auth-protect-api",
      description: "Protect API routes",
      rule: "Every API route that requires auth must call requireAuth() at the top. No exceptions.",
    },
  ],
  interdictions: [
    "NEVER store auth tokens in localStorage — use httpOnly cookies.",
    "NEVER trust client-sent user IDs — always derive user identity from the session.",
    "NEVER expose user passwords, hashes, or internal IDs in API responses.",
    "NEVER skip auth checks on API routes because 'the UI prevents access'.",
  ],
  crossRefs: [],
};
