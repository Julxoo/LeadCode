import type { Rule } from "../types.js";

export const tailwindRules: Rule = {
  id: "tailwind",
  name: "Tailwind CSS",
  applies: (a) => a.detected.css === "tailwind",
  gaps: [],
  conventions: [
    {
      id: "tw-class-order",
      description: "Tailwind class ordering",
      rule: "Order classes: layout (flex, grid) → position → box model (w, h, p, m) → typography → visual (bg, border, shadow) → interactive (hover, focus). Use Prettier plugin for auto-sorting if available.",
    },
    {
      id: "tw-conditional-classes",
      description: "Conditional class merging",
      rule: "Use cn() (clsx + twMerge) for conditional classes. Never concatenate class strings manually. Define cn() in lib/utils.ts.",
    },
    {
      id: "tw-responsive",
      description: "Mobile-first responsive",
      rule: "Design mobile-first. Use breakpoint prefixes in ascending order: base → sm: → md: → lg: → xl:.",
    },
    {
      id: "tw-no-arbitrary-recurring",
      description: "Avoid recurring arbitrary values",
      rule: "If an arbitrary value (e.g., `text-[13px]`, `bg-[#1a1a2e]`) is used more than twice, extract it to the Tailwind config as a design token.",
    },
    {
      id: "tw-apply-sparingly",
      description: "Minimal @apply usage",
      rule: "Use @apply only for truly global, reused patterns (e.g., .btn-primary). Prefer component composition over @apply.",
    },
  ],
  interdictions: [
    "NEVER use inline style={{}} when Tailwind can express the same thing.",
    "NEVER create custom CSS classes that duplicate existing Tailwind utilities.",
    "NEVER hardcode color hex values in className — use Tailwind color tokens.",
    "NEVER use !important in Tailwind — restructure your classes instead.",
  ],
  crossRefs: [],
};
