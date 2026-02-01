import type { Rule } from "../types.js";

export const nodeRules: Rule = {
  id: "node",
  name: "Node.js Backend",
  applies: (a) => {
    const name = a.framework?.name;
    return name === "express" || name === "fastify" || name === "hono";
  },
  gaps: [
    {
      category: "error-handling",
      severity: "high",
      check: (a) => !a.structure.hasServicesDir && !a.structure.hasUtilsDir,
      message: "No structured error handling layer detected",
      details:
        "Every Express/Fastify app needs centralized error handling. Unhandled errors crash the process.",
    },
    {
      category: "input-validation",
      severity: "high",
      check: (a) => a.detected.validation === null,
      message: "No input validation library detected",
      details:
        "All API inputs must be validated. Without a validation library, Claude will skip validation or do it inconsistently.",
    },
    {
      category: "env-validation",
      severity: "medium",
      check: (a) => !a.structure.hasEnvValidation,
      message: "No environment variable validation detected",
      details:
        "Validate all required env vars at boot time. Fail fast, not at runtime.",
    },
  ],
  conventions: [
    {
      id: "node-structured-errors",
      description: "Structured error responses",
      rule: "All API errors must return consistent JSON: { error: string, code: string, details?: unknown }. Use appropriate HTTP status codes.",
    },
    {
      id: "node-async-handlers",
      description: "Async error handling",
      rule: "Wrap all async route handlers to catch errors. Use express-async-errors or equivalent.",
    },
    {
      id: "node-env-config",
      description: "Centralized config",
      rule: "All environment variables accessed through a single config module. Never use process.env directly in business logic.",
    },
    {
      id: "node-no-business-in-routes",
      description: "Separate routing from logic",
      rule: "Route handlers should only: parse input, call a service, return response. Business logic goes in /services.",
    },
  ],
  interdictions: [
    "NEVER log sensitive data (passwords, tokens, PII) in any log level.",
    "NEVER use synchronous fs or crypto operations in request handlers.",
    "NEVER trust client input without validation — validate at every API boundary.",
    "NEVER catch errors silently (empty catch blocks).",
  ],
  crossRefs: [],
};
