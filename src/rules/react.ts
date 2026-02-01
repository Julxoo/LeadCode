import type { Rule } from "../types.js";

export const reactRules: Rule = {
  id: "react",
  name: "React",
  applies: (a) => {
    const deps = { ...a.dependencies, ...a.devDependencies };
    return "react" in deps;
  },
  gaps: [
    {
      category: "component-structure",
      severity: "medium",
      check: (a) => !a.structure.hasComponentsDir,
      message: "No dedicated components directory found",
      details:
        "Without a clear component organization, Claude will create components in random locations.",
    },
    {
      category: "testing",
      severity: "medium",
      check: (a) => !a.detected.testing && !a.structure.hasTestsDir,
      message: "No test runner or test directory detected",
      details:
        "Without a testing setup, Claude cannot generate or run tests for new code.",
    },
  ],
  conventions: [
    {
      id: "react-small-components",
      description: "Small, focused components",
      rule: "Each component file should do ONE thing. If a component exceeds ~100 lines, split it.",
    },
    {
      id: "react-naming",
      description: "Component naming",
      rule: "PascalCase for components. Filename matches component name. One exported component per file.",
    },
    {
      id: "react-hooks-extract",
      description: "Extract custom hooks",
      rule: "Extract reusable logic into custom hooks in a /hooks directory. Keep components focused on rendering.",
    },
    {
      id: "react-no-prop-drilling",
      description: "Avoid prop drilling",
      rule: "If props are passed through more than 2 levels, use context, composition, or state management.",
    },
    {
      id: "react-key-prop",
      description: "Stable keys in lists",
      rule: "Always use stable, unique keys for list rendering. Never use array index as key for dynamic lists.",
    },
  ],
  interdictions: [
    "NEVER mutate state directly. Always use setState or state management updaters.",
    "NEVER use useEffect for derived state — compute it during render.",
    "NEVER define components inside other components — it causes remounts on every render.",
  ],
  crossRefs: [],
};
