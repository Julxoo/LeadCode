import type { DetectedStack, FrameworkInfo, StructureInfo } from "../types.js";

type Deps = Record<string, string>;

function findVersion(name: string, deps: Deps, devDeps: Deps): string | null {
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
  // Next.js
  if (has("next", deps, devDeps)) {
    const version = findVersion("next", deps, devDeps) ?? "unknown";
    const variant = structure.hasAppDir
      ? "app-router"
      : structure.hasPagesDir
        ? "pages-router"
        : "unknown";
    return { name: "next", version, variant };
  }

  // Nuxt
  if (has("nuxt", deps, devDeps)) {
    return { name: "nuxt", version: findVersion("nuxt", deps, devDeps) ?? "unknown" };
  }

  // Remix
  if (hasAny(["@remix-run/react", "@remix-run/node"], deps, devDeps)) {
    return { name: "remix", version: findVersion("@remix-run/react", deps, devDeps) ?? "unknown" };
  }

  // Astro
  if (has("astro", deps, devDeps)) {
    return { name: "astro", version: findVersion("astro", deps, devDeps) ?? "unknown" };
  }

  // SvelteKit
  if (has("@sveltejs/kit", deps, devDeps)) {
    return { name: "sveltekit", version: findVersion("@sveltejs/kit", deps, devDeps) ?? "unknown" };
  }

  // SolidStart
  if (has("@solidjs/start", deps, devDeps)) {
    return { name: "solid-start", version: findVersion("@solidjs/start", deps, devDeps) ?? "unknown" };
  }

  // Vite + React (SPA)
  if (has("vite", deps, devDeps) && has("react", deps, devDeps)) {
    return { name: "vite-react", version: findVersion("vite", deps, devDeps) ?? "unknown" };
  }

  // Express
  if (has("express", deps, devDeps)) {
    return { name: "express", version: findVersion("express", deps, devDeps) ?? "unknown" };
  }

  // Fastify
  if (has("fastify", deps, devDeps)) {
    return { name: "fastify", version: findVersion("fastify", deps, devDeps) ?? "unknown" };
  }

  // Hono
  if (has("hono", deps, devDeps)) {
    return { name: "hono", version: findVersion("hono", deps, devDeps) ?? "unknown" };
  }

  // Standalone React (no framework detected above)
  if (has("react", deps, devDeps)) {
    return { name: "react", version: findVersion("react", deps, devDeps) ?? "unknown" };
  }

  return null;
}

export function detectStack(deps: Deps, devDeps: Deps): DetectedStack {
  const all = { ...deps, ...devDeps };

  // ORM
  let orm: string | null = null;
  if ("prisma" in all || "@prisma/client" in all) orm = "prisma";
  else if ("drizzle-orm" in all) orm = "drizzle";
  else if ("typeorm" in all) orm = "typeorm";
  else if ("kysely" in all) orm = "kysely";
  else if ("mongoose" in all) orm = "mongoose";
  else if ("sequelize" in all) orm = "sequelize";
  else if ("@neondatabase/serverless" in all) orm = "neon";
  else if ("libsql" in all || "@libsql/client" in all) orm = "libsql";
  else if ("better-sqlite3" in all) orm = "better-sqlite3";

  // Auth
  let auth: string | null = null;
  if ("next-auth" in all || "@auth/core" in all) auth = "next-auth";
  else if ("@clerk/nextjs" in all || "@clerk/clerk-sdk-node" in all) auth = "clerk";
  else if ("lucia" in all || "@lucia-auth/adapter-prisma" in all) auth = "lucia";
  else if ("@supabase/auth-helpers-nextjs" in all || "@supabase/ssr" in all) auth = "supabase-auth";
  else if ("passport" in all) auth = "passport";
  else if ("better-auth" in all) auth = "better-auth";
  else if ("@kinde-oss/kinde-auth-nextjs" in all) auth = "kinde";
  else if ("@auth0/nextjs-auth0" in all || "@auth0/auth0-react" in all) auth = "auth0";
  else if ("firebase-admin" in all) auth = "firebase";

  // Validation
  let validation: string | null = null;
  if ("zod" in all) validation = "zod";
  else if ("yup" in all) validation = "yup";
  else if ("joi" in all) validation = "joi";
  else if ("valibot" in all) validation = "valibot";
  else if ("arktype" in all) validation = "arktype";

  // CSS
  let css: string | null = null;
  if ("tailwindcss" in all) css = "tailwind";
  else if ("@chakra-ui/react" in all) css = "chakra";
  else if ("@mui/material" in all) css = "mui";
  else if ("styled-components" in all) css = "styled-components";
  else if ("@emotion/react" in all) css = "emotion";
  else if ("@pandacss/dev" in all) css = "panda";
  else if ("@vanilla-extract/css" in all) css = "vanilla-extract";
  else if ("unocss" in all) css = "unocss";
  else if ("sass" in all) css = "sass";

  // Testing
  let testing: string | null = null;
  if ("vitest" in all) testing = "vitest";
  else if ("jest" in all) testing = "jest";
  else if ("@playwright/test" in all) testing = "playwright";
  else if ("cypress" in all) testing = "cypress";
  // Also detect test utilities (secondary)
  // @testing-library/react, msw, supertest are addons, not primary test runners

  // State management (client state only)
  let stateManagement: string | null = null;
  if ("zustand" in all) stateManagement = "zustand";
  else if ("@reduxjs/toolkit" in all || "redux" in all) stateManagement = "redux";
  else if ("jotai" in all) stateManagement = "jotai";
  else if ("valtio" in all) stateManagement = "valtio";
  else if ("@xstate/react" in all || "xstate" in all) stateManagement = "xstate";
  else if ("recoil" in all) stateManagement = "recoil";
  else if ("mobx" in all || "mobx-react-lite" in all) stateManagement = "mobx";

  // Data fetching / server state (separate from client state)
  let dataFetching: string | null = null;
  if ("@tanstack/react-query" in all) dataFetching = "react-query";
  else if ("swr" in all) dataFetching = "swr";

  // Form library
  let formLibrary: string | null = null;
  if ("react-hook-form" in all) formLibrary = "react-hook-form";
  else if ("formik" in all) formLibrary = "formik";
  else if ("@tanstack/react-form" in all) formLibrary = "tanstack-form";

  // API style
  let apiStyle: string | null = null;
  if ("@trpc/server" in all || "@trpc/client" in all) apiStyle = "trpc";
  else if ("graphql" in all || "@apollo/client" in all || "urql" in all) apiStyle = "graphql";

  // Bundler
  let bundler: string | null = null;
  if ("turbopack" in all || "next" in all) bundler = "next-bundler";
  else if ("vite" in all) bundler = "vite";
  else if ("webpack" in all) bundler = "webpack";
  else if ("esbuild" in all) bundler = "esbuild";
  else if ("tsup" in all) bundler = "tsup";

  // Linter
  let linter: string | null = null;
  if ("eslint" in all) linter = "eslint";
  else if ("@biomejs/biome" in all || "biome" in all) linter = "biome";

  // Formatter
  let formatter: string | null = null;
  if ("prettier" in all) formatter = "prettier";
  else if ("@biomejs/biome" in all || "biome" in all) formatter = "biome";

  // --- New categories ---

  // i18n
  let i18n: string | null = null;
  if ("next-intl" in all) i18n = "next-intl";
  else if ("i18next" in all || "react-i18next" in all) i18n = "i18next";
  else if ("@lingui/core" in all) i18n = "lingui";
  else if ("react-intl" in all) i18n = "react-intl";

  // Runtime
  let runtime: string | null = "node"; // default
  // Will be overridden by analyze-repo if bun.lockb or deno.json detected

  // Monorepo
  let monorepo: string | null = null;
  if ("turbo" in all) monorepo = "turborepo";
  else if ("nx" in all) monorepo = "nx";
  else if ("lerna" in all) monorepo = "lerna";

  // Deployment (detected from deps — file-based detection done in structure analyzer)
  let deployment: string | null = null;
  if ("@vercel/analytics" in all || "@vercel/speed-insights" in all) deployment = "vercel";

  // Database (inferred from drivers)
  let database: string | null = null;
  if ("pg" in all || "@neondatabase/serverless" in all || "postgres" in all) database = "postgres";
  else if ("mysql2" in all) database = "mysql";
  else if ("better-sqlite3" in all || "libsql" in all || "@libsql/client" in all) database = "sqlite";
  else if ("mongodb" in all || "mongoose" in all) database = "mongodb";
  else if ("@supabase/supabase-js" in all) database = "supabase";

  // Email
  let email: string | null = null;
  if ("resend" in all) email = "resend";
  else if ("nodemailer" in all) email = "nodemailer";
  else if ("@sendgrid/mail" in all) email = "sendgrid";
  else if ("postmark" in all) email = "postmark";
  else if ("@react-email/components" in all) email = "react-email";

  // File upload
  let fileUpload: string | null = null;
  if ("uploadthing" in all) fileUpload = "uploadthing";
  else if ("@vercel/blob" in all) fileUpload = "vercel-blob";
  else if ("multer" in all) fileUpload = "multer";
  else if ("@aws-sdk/client-s3" in all) fileUpload = "s3";

  // Payments
  let payments: string | null = null;
  if ("stripe" in all || "@stripe/stripe-js" in all) payments = "stripe";
  else if ("@lemonsqueezy/lemonsqueezy.js" in all) payments = "lemonsqueezy";

  // Realtime
  let realtime: string | null = null;
  if ("socket.io" in all || "socket.io-client" in all) realtime = "socket.io";
  else if ("pusher" in all || "pusher-js" in all) realtime = "pusher";
  else if ("ably" in all) realtime = "ably";
  else if ("@supabase/realtime-js" in all) realtime = "supabase-realtime";

  // CMS
  let cms: string | null = null;
  if ("contentlayer" in all || "contentlayer2" in all) cms = "contentlayer";
  else if ("next-mdx-remote" in all) cms = "mdx-remote";
  else if ("@sanity/client" in all) cms = "sanity";
  else if ("@notionhq/client" in all) cms = "notion";
  else if ("contentful" in all) cms = "contentful";
  else if ("@strapi/strapi" in all) cms = "strapi";

  // Jobs / Queues
  let jobs: string | null = null;
  if ("bullmq" in all || "bull" in all) jobs = "bullmq";
  else if ("inngest" in all) jobs = "inngest";
  else if ("@trigger.dev/sdk" in all) jobs = "trigger-dev";

  // UI Components
  let uiComponents: string | null = null;
  if ("@radix-ui/react-slot" in all || "@radix-ui/react-dialog" in all ||
      "@radix-ui/react-dropdown-menu" in all || "@radix-ui/react-separator" in all) {
    // If radix + tailwind + class-variance-authority → likely shadcn
    if ("tailwindcss" in all && "class-variance-authority" in all) {
      uiComponents = "shadcn";
    } else {
      uiComponents = "radix";
    }
  } else if ("@headlessui/react" in all) uiComponents = "headless-ui";
  else if ("@ark-ui/react" in all) uiComponents = "ark-ui";

  return {
    orm,
    auth,
    validation,
    css,
    testing,
    stateManagement,
    dataFetching,
    formLibrary,
    apiStyle,
    bundler,
    linter,
    formatter,
    i18n,
    runtime,
    monorepo,
    deployment,
    database,
    email,
    fileUpload,
    payments,
    realtime,
    cms,
    jobs,
    uiComponents,
  };
}
