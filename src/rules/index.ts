import type { Rule, RepoAnalysis, Gap, Convention, CrossRef } from "../types.js";
import { nextjsRules, nextjsPagesRules } from "./nextjs.js";
import { reactRules } from "./react.js";
import { nodeRules } from "./node.js";
import { prismaRules } from "./prisma.js";
import { drizzleRules } from "./drizzle.js";
import { authRules } from "./auth.js";
import { validationRules } from "./validation.js";
import { typescriptRules } from "./typescript.js";
import { tailwindRules } from "./tailwind.js";
import { stateManagementRules } from "./state.js";
import { trpcRules } from "./trpc.js";
import { crossStackRules } from "./cross-stack.js";

const allRules: Rule[] = [
  nextjsRules,
  nextjsPagesRules,
  reactRules,
  nodeRules,
  prismaRules,
  drizzleRules,
  authRules,
  validationRules,
  typescriptRules,
  tailwindRules,
  stateManagementRules,
  trpcRules,
  crossStackRules,
];

export function getApplicableRules(analysis: RepoAnalysis): Rule[] {
  return allRules.filter((r) => r.applies(analysis));
}

export function detectGaps(analysis: RepoAnalysis): Gap[] {
  const rules = getApplicableRules(analysis);
  const gaps: Gap[] = [];

  for (const rule of rules) {
    for (const gapCheck of rule.gaps) {
      if (gapCheck.check(analysis)) {
        gaps.push({
          category: gapCheck.category,
          severity: gapCheck.severity,
          message: gapCheck.message,
          details: gapCheck.details,
        });
      }
    }
  }

  return gaps;
}

export function getConventions(analysis: RepoAnalysis): Convention[] {
  const rules = getApplicableRules(analysis);
  const seen = new Set<string>();
  const conventions: Convention[] = [];

  for (const rule of rules) {
    for (const conv of rule.conventions) {
      if (!seen.has(conv.id)) {
        seen.add(conv.id);
        conventions.push(conv);
      }
    }
  }

  return conventions;
}

export function getInterdictions(analysis: RepoAnalysis): string[] {
  const rules = getApplicableRules(analysis);
  const seen = new Set<string>();
  const interdictions: string[] = [];

  for (const rule of rules) {
    for (const inter of rule.interdictions) {
      if (!seen.has(inter)) {
        seen.add(inter);
        interdictions.push(inter);
      }
    }
  }

  return interdictions;
}

export function getActiveCrossRefs(analysis: RepoAnalysis): CrossRef[] {
  const rules = getApplicableRules(analysis);
  const active: CrossRef[] = [];

  // Build a set of detected tech identifiers
  const techs = new Set<string>();
  if (analysis.framework) {
    techs.add(analysis.framework.name);
    // Add "react" for React-based frameworks so cross-refs like ["tailwind", "react"] activate
    const reactFrameworks = new Set(["next", "vite-react", "remix", "react"]);
    if (reactFrameworks.has(analysis.framework.name)) techs.add("react");
  }
  const detected = analysis.detected;
  // Add all non-null detected techs
  for (const value of Object.values(detected)) {
    if (typeof value === "string") techs.add(value);
  }

  for (const rule of rules) {
    for (const crossRef of rule.crossRefs) {
      // A crossRef is active if ALL its required techs are present
      if (crossRef.techs.every((t) => techs.has(t))) {
        active.push(crossRef);
      }
    }
  }

  return active;
}
