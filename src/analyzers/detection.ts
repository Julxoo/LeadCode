import type { DetectedStack, FrameworkInfo, RecognizedTech, StructureInfo } from "../types.js";

type Deps = Record<string, string>;

function ver(name: string, deps: Deps, devDeps: Deps): string | null {
  const v = deps[name] ?? devDeps[name];
  if (!v) return null;
  const match = v.match(/\d+\.\d+\.\d+/);
  return match ? match[0] : v.replace(/[\^~>=<]/g, "").trim();
}

function has(name: string, deps: Deps, devDeps: Deps): boolean {
  return name in deps || name in devDeps;
}

function hasAny(names: string[], deps: Deps, devDeps: Deps): boolean {
  return names.some((n) => has(n, deps, devDeps));
}

export function detectFramework(
  deps: Deps,
  devDeps: Deps,
  structure: StructureInfo
): FrameworkInfo | null {
  if (has("next", deps, devDeps)) {
    const version = ver("next", deps, devDeps) ?? "unknown";
    const variant = structure.hasAppDir
      ? "app-router"
      : structure.hasPagesDir
        ? "pages-router"
        : "unknown";
    return { name: "next", version, variant };
  }
  if (has("nuxt", deps, devDeps))
    return { name: "nuxt", version: ver("nuxt", deps, devDeps) ?? "unknown" };
  if (hasAny(["@remix-run/react", "@remix-run/node"], deps, devDeps))
    return { name: "remix", version: ver("@remix-run/react", deps, devDeps) ?? "unknown" };
  if (has("astro", deps, devDeps))
    return { name: "astro", version: ver("astro", deps, devDeps) ?? "unknown" };
  if (has("@sveltejs/kit", deps, devDeps))
    return { name: "sveltekit", version: ver("@sveltejs/kit", deps, devDeps) ?? "unknown" };
  if (has("@solidjs/start", deps, devDeps))
    return { name: "solid-start", version: ver("@solidjs/start", deps, devDeps) ?? "unknown" };
  if (has("vite", deps, devDeps) && has("react", deps, devDeps))
    return { name: "vite-react", version: ver("vite", deps, devDeps) ?? "unknown" };
  if (has("express", deps, devDeps))
    return { name: "express", version: ver("express", deps, devDeps) ?? "unknown" };
  if (has("fastify", deps, devDeps))
    return { name: "fastify", version: ver("fastify", deps, devDeps) ?? "unknown" };
  if (has("hono", deps, devDeps))
    return { name: "hono", version: ver("hono", deps, devDeps) ?? "unknown" };
  if (has("react", deps, devDeps))
    return { name: "react", version: ver("react", deps, devDeps) ?? "unknown" };
  return null;
}

/** Heuristic rules: package name(s) → { canonical name, category } */
interface Rule {
  packages: string[];
  name: string;
  category: string;
  versionFrom?: string; // which package to extract version from (defaults to first)
  condition?: (all: Deps, structure?: StructureInfo) => boolean;
}

const RULES: Rule[] = [
  // ORM / Database access
  { packages: ["prisma", "@prisma/client"], name: "prisma", category: "orm" },
  { packages: ["drizzle-orm"], name: "drizzle", category: "orm" },
  { packages: ["typeorm"], name: "typeorm", category: "orm" },
  { packages: ["@mikro-orm/core"], name: "mikro-orm", category: "orm" },
  { packages: ["kysely"], name: "kysely", category: "orm" },
  { packages: ["mongoose"], name: "mongoose", category: "orm" },
  { packages: ["sequelize"], name: "sequelize", category: "orm" },
  { packages: ["objection"], name: "objection", category: "orm" },
  { packages: ["@neondatabase/serverless"], name: "neon", category: "database-driver" },
  { packages: ["libsql", "@libsql/client"], name: "libsql", category: "database-driver" },
  { packages: ["better-sqlite3"], name: "better-sqlite3", category: "database-driver" },
  { packages: ["knex"], name: "knex", category: "query-builder" },

  // Auth
  { packages: ["next-auth", "@auth/core"], name: "next-auth", category: "auth" },
  { packages: ["@clerk/nextjs", "@clerk/clerk-sdk-node"], name: "clerk", category: "auth" },
  { packages: ["lucia", "@lucia-auth/adapter-prisma"], name: "lucia", category: "auth" },
  { packages: ["@supabase/auth-helpers-nextjs", "@supabase/ssr"], name: "supabase-auth", category: "auth" },
  { packages: ["passport"], name: "passport", category: "auth" },
  { packages: ["better-auth"], name: "better-auth", category: "auth" },
  { packages: ["@kinde-oss/kinde-auth-nextjs"], name: "kinde", category: "auth" },
  { packages: ["@auth0/nextjs-auth0", "@auth0/auth0-react"], name: "auth0", category: "auth" },
  { packages: ["firebase-admin"], name: "firebase", category: "auth" },
  { packages: ["@workos-inc/node"], name: "workos", category: "auth" },
  { packages: ["jsonwebtoken", "jose"], name: "jwt", category: "auth" },

  // Validation
  { packages: ["zod"], name: "zod", category: "validation" },
  { packages: ["yup"], name: "yup", category: "validation" },
  { packages: ["joi"], name: "joi", category: "validation" },
  { packages: ["valibot"], name: "valibot", category: "validation" },
  { packages: ["arktype"], name: "arktype", category: "validation" },

  // CSS / Styling
  { packages: ["tailwindcss"], name: "tailwind", category: "css" },
  { packages: ["@chakra-ui/react"], name: "chakra", category: "css" },
  { packages: ["@mui/material"], name: "mui", category: "css" },
  { packages: ["styled-components"], name: "styled-components", category: "css" },
  { packages: ["@emotion/react"], name: "emotion", category: "css" },
  { packages: ["@pandacss/dev"], name: "panda", category: "css" },
  { packages: ["@vanilla-extract/css"], name: "vanilla-extract", category: "css" },
  { packages: ["unocss"], name: "unocss", category: "css" },
  { packages: ["@mantine/core"], name: "mantine", category: "css" },
  { packages: ["antd"], name: "ant-design", category: "css" },
  { packages: ["sass"], name: "sass", category: "css" },
  { packages: ["bootstrap"], name: "bootstrap", category: "css" },

  // Testing
  { packages: ["vitest"], name: "vitest", category: "testing" },
  { packages: ["jest"], name: "jest", category: "testing" },
  { packages: ["@playwright/test"], name: "playwright", category: "testing" },
  { packages: ["cypress"], name: "cypress", category: "testing" },
  { packages: ["@testing-library/react"], name: "testing-library", category: "testing" },
  { packages: ["msw"], name: "msw", category: "testing" },
  { packages: ["supertest"], name: "supertest", category: "testing" },

  // State management
  { packages: ["zustand"], name: "zustand", category: "state" },
  { packages: ["@reduxjs/toolkit", "redux"], name: "redux", category: "state" },
  { packages: ["jotai"], name: "jotai", category: "state" },
  { packages: ["valtio"], name: "valtio", category: "state" },
  { packages: ["@xstate/react", "xstate"], name: "xstate", category: "state" },
  { packages: ["recoil"], name: "recoil", category: "state" },
  { packages: ["mobx", "mobx-react-lite"], name: "mobx", category: "state" },

  // Data fetching
  { packages: ["@tanstack/react-query"], name: "react-query", category: "data-fetching" },
  { packages: ["swr"], name: "swr", category: "data-fetching" },
  { packages: ["@apollo/client"], name: "apollo", category: "data-fetching" },
  { packages: ["urql"], name: "urql", category: "data-fetching" },

  // Forms
  { packages: ["react-hook-form"], name: "react-hook-form", category: "forms" },
  { packages: ["formik"], name: "formik", category: "forms" },
  { packages: ["@tanstack/react-form"], name: "tanstack-form", category: "forms" },

  // API
  { packages: ["@trpc/server", "@trpc/client"], name: "trpc", category: "api" },
  { packages: ["graphql"], name: "graphql", category: "api" },

  // Bundler / Build
  { packages: ["vite"], name: "vite", category: "bundler" },
  { packages: ["webpack"], name: "webpack", category: "bundler" },
  { packages: ["esbuild"], name: "esbuild", category: "bundler" },
  { packages: ["tsup"], name: "tsup", category: "bundler" },
  { packages: ["rollup"], name: "rollup", category: "bundler" },

  // Linter / Formatter
  { packages: ["eslint"], name: "eslint", category: "linter" },
  { packages: ["@biomejs/biome", "biome"], name: "biome", category: "linter" },
  { packages: ["prettier"], name: "prettier", category: "formatter" },

  // i18n
  { packages: ["next-intl"], name: "next-intl", category: "i18n" },
  { packages: ["i18next", "react-i18next"], name: "i18next", category: "i18n" },
  { packages: ["@lingui/core"], name: "lingui", category: "i18n" },
  { packages: ["react-intl"], name: "react-intl", category: "i18n" },

  // Monorepo
  { packages: ["turbo"], name: "turborepo", category: "monorepo" },
  { packages: ["nx"], name: "nx", category: "monorepo" },
  { packages: ["lerna"], name: "lerna", category: "monorepo" },

  // Database drivers
  { packages: ["pg", "postgres"], name: "postgres", category: "database" },
  { packages: ["mysql2"], name: "mysql", category: "database" },
  { packages: ["mongodb"], name: "mongodb", category: "database" },
  { packages: ["@supabase/supabase-js"], name: "supabase", category: "database" },
  { packages: ["@planetscale/database"], name: "planetscale", category: "database" },
  { packages: ["ioredis", "@upstash/redis"], name: "redis", category: "database" },
  { packages: ["@vercel/postgres"], name: "vercel-postgres", category: "database" },

  // Email
  { packages: ["resend"], name: "resend", category: "email" },
  { packages: ["nodemailer"], name: "nodemailer", category: "email" },
  { packages: ["@sendgrid/mail"], name: "sendgrid", category: "email" },
  { packages: ["postmark"], name: "postmark", category: "email" },
  { packages: ["@react-email/components"], name: "react-email", category: "email" },

  // File upload
  { packages: ["uploadthing"], name: "uploadthing", category: "file-upload" },
  { packages: ["@vercel/blob"], name: "vercel-blob", category: "file-upload" },
  { packages: ["multer"], name: "multer", category: "file-upload" },
  { packages: ["@aws-sdk/client-s3"], name: "s3", category: "file-upload" },
  { packages: ["cloudinary"], name: "cloudinary", category: "file-upload" },

  // Payments
  { packages: ["stripe", "@stripe/stripe-js"], name: "stripe", category: "payments" },
  { packages: ["@lemonsqueezy/lemonsqueezy.js"], name: "lemonsqueezy", category: "payments" },

  // Realtime
  { packages: ["socket.io", "socket.io-client"], name: "socket.io", category: "realtime" },
  { packages: ["pusher", "pusher-js"], name: "pusher", category: "realtime" },
  { packages: ["ably"], name: "ably", category: "realtime" },
  { packages: ["@supabase/realtime-js"], name: "supabase-realtime", category: "realtime" },

  // CMS
  { packages: ["contentlayer", "contentlayer2"], name: "contentlayer", category: "cms" },
  { packages: ["next-mdx-remote"], name: "mdx-remote", category: "cms" },
  { packages: ["@sanity/client"], name: "sanity", category: "cms" },
  { packages: ["@notionhq/client"], name: "notion", category: "cms" },
  { packages: ["contentful"], name: "contentful", category: "cms" },
  { packages: ["@strapi/strapi"], name: "strapi", category: "cms" },

  // Jobs / Queues
  { packages: ["bullmq", "bull"], name: "bullmq", category: "jobs" },
  { packages: ["inngest"], name: "inngest", category: "jobs" },
  { packages: ["@trigger.dev/sdk"], name: "trigger-dev", category: "jobs" },

  // UI Components
  {
    packages: ["@radix-ui/react-slot", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-separator"],
    name: "shadcn",
    category: "ui-components",
    versionFrom: "__none__",
    condition: (all, structure) =>
      "tailwindcss" in all && "class-variance-authority" in all &&
      (!structure || structure.topLevelDirs.includes("components") || structure.srcDirs.includes("components")),
  },
  { packages: ["@radix-ui/react-slot", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"], name: "radix", category: "ui-components" },
  { packages: ["@headlessui/react"], name: "headless-ui", category: "ui-components" },
  { packages: ["@ark-ui/react"], name: "ark-ui", category: "ui-components" },
  { packages: ["@nextui-org/react"], name: "nextui", category: "ui-components" },
  { packages: ["@tremor/react"], name: "tremor", category: "ui-components" },
  { packages: ["primereact"], name: "primereact", category: "ui-components" },
  { packages: ["react-bootstrap"], name: "react-bootstrap", category: "ui-components" },
  { packages: ["flowbite-react"], name: "flowbite", category: "ui-components" },

  // Observability / Logging
  { packages: ["@sentry/nextjs", "@sentry/node", "@sentry/react"], name: "sentry", category: "observability" },
  { packages: ["winston"], name: "winston", category: "logging" },
  { packages: ["pino"], name: "pino", category: "logging" },

  // Deployment hints
  { packages: ["@vercel/analytics", "@vercel/speed-insights"], name: "vercel", category: "deployment" },
  { packages: ["@netlify/functions"], name: "netlify", category: "deployment" },
  { packages: ["wrangler", "@cloudflare/workers-types"], name: "cloudflare", category: "deployment" },
];

/** Packages to always exclude from unrecognized (noise) */
const NOISE_PREFIXES = ["@types/", "@typescript-eslint/"];
const NOISE_EXACT = new Set([
  "typescript", "tslib", "@types/node", "@types/react", "@types/react-dom",
  "eslint-config-next", "eslint-config-prettier",
  "autoprefixer", "postcss",
]);

export function detectStack(deps: Deps, devDeps: Deps, structure?: StructureInfo): DetectedStack {
  const all = { ...deps, ...devDeps };
  const recognized: Record<string, RecognizedTech> = {};
  const matchedPackages = new Set<string>();

  for (const rule of RULES) {
    // Skip if already recognized with same name (first match wins, e.g. shadcn before radix)
    if (recognized[rule.name]) continue;

    const matchingPkgs = rule.packages.filter(p => p in all);
    if (matchingPkgs.length === 0) continue;

    // Skip if all matching packages are already claimed by a previous rule
    if (matchingPkgs.every(p => matchedPackages.has(p))) continue;

    if (rule.condition && !rule.condition(all, structure)) continue;

    const versionPkg = rule.versionFrom ?? rule.packages[0];
    recognized[rule.name] = {
      name: rule.name,
      version: ver(versionPkg, deps, devDeps),
      category: rule.category,
    };

    for (const p of rule.packages) {
      if (p in all) matchedPackages.add(p);
    }
  }

  // Build unrecognized list: all deps not matched by any rule, minus noise
  const unrecognized: string[] = [];
  for (const pkg of Object.keys(all)) {
    if (matchedPackages.has(pkg)) continue;
    if (NOISE_EXACT.has(pkg)) continue;
    if (NOISE_PREFIXES.some(prefix => pkg.startsWith(prefix))) continue;
    // Skip framework packages (already in framework detection)
    if (["next", "nuxt", "react", "react-dom", "astro", "vite", "express", "fastify", "hono",
         "@remix-run/react", "@remix-run/node", "@sveltejs/kit", "@solidjs/start"].includes(pkg)) continue;
    unrecognized.push(pkg);
  }

  return { recognized, unrecognized };
}
