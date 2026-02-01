import type { Rule } from "../types.js";

export const crossStackRules: Rule = {
  id: "cross-stack",
  name: "Cross-Stack Rules",
  applies: () => true, // Always active, individual crossRefs have their own conditions
  gaps: [],
  conventions: [],
  interdictions: [],
  crossRefs: [
    // Next.js + Prisma
    {
      techs: ["next", "prisma"],
      conventions: [
        {
          id: "next-prisma-server-only",
          description: "Prisma only in server context",
          rule: "Import Prisma client ONLY in Server Components, Server Actions, Route Handlers, and middleware. Never in files with 'use client'.",
        },
        {
          id: "next-prisma-singleton",
          description: "Prisma singleton for Next.js",
          rule: "Use globalThis pattern for Prisma in development to prevent hot-reload connection leaks: `globalThis.prisma ??= new PrismaClient()`.",
        },
        {
          id: "next-prisma-data-layer",
          description: "Data access layer",
          rule: "Create a data access layer (lib/data/ or lib/queries/) that wraps Prisma calls. Server Components call data functions, not Prisma directly.",
        },
      ],
      interdictions: [
        "NEVER import @prisma/client in any file that has 'use client' directive.",
        "NEVER pass full Prisma models to Client Components — select only the fields needed and create plain objects.",
        "NEVER run Prisma queries inside React render functions without proper caching (use React cache() or unstable_cache).",
      ],
    },
    // Next.js + NextAuth
    {
      techs: ["next", "next-auth"],
      conventions: [
        {
          id: "next-auth-middleware",
          description: "Auth via middleware",
          rule: "Use middleware.ts with NextAuth's auth() wrapper to protect routes. Define public routes explicitly, protect everything else by default.",
        },
        {
          id: "next-auth-session-server",
          description: "Session in Server Components",
          rule: "Use auth() from next-auth in Server Components to get the session. Use useSession() only in Client Components that need reactive session state.",
        },
      ],
      interdictions: [
        "NEVER check auth client-side only — always validate server-side.",
        "NEVER expose NextAuth secret or provider credentials in client code.",
      ],
    },
    // Next.js + Zod
    {
      techs: ["next", "zod"],
      conventions: [
        {
          id: "next-zod-server-actions",
          description: "Zod in Server Actions",
          rule: "Validate all Server Action inputs with Zod schemas. Parse at the top of every action before any business logic.",
        },
        {
          id: "next-zod-route-handlers",
          description: "Zod in Route Handlers",
          rule: "Validate request body/params with Zod in every Route Handler. Return 400 with formatted errors on validation failure.",
        },
      ],
      interdictions: [],
    },
    // Prisma + Zod
    {
      techs: ["prisma", "zod"],
      conventions: [
        {
          id: "prisma-zod-sync",
          description: "Keep Prisma and Zod in sync",
          rule: "Zod schemas must mirror Prisma models for input validation. Consider using zod-prisma-types or manually maintaining parity.",
        },
      ],
      interdictions: [
        "NEVER let Zod schemas drift from Prisma models — this causes runtime type mismatches.",
      ],
    },
    // tRPC + Zod
    {
      techs: ["trpc", "zod"],
      conventions: [
        {
          id: "trpc-zod-input",
          description: "Zod as tRPC input validator",
          rule: "Use Zod schemas as tRPC .input() validators. Share schemas between client and server for end-to-end type safety.",
        },
      ],
      interdictions: [],
    },
    // React Query + Next.js
    {
      techs: ["next", "react-query"],
      conventions: [
        {
          id: "next-rq-server-prefetch",
          description: "Prefetch in Server Components",
          rule: "Use React Query's HydrationBoundary to prefetch data in Server Components and hydrate on the client.",
        },
        {
          id: "next-rq-client-only",
          description: "React Query for client interactions",
          rule: "Use React Query for user-triggered data fetching (pagination, search, mutations). Use Server Components for initial page data.",
        },
      ],
      interdictions: [
        "NEVER use React Query to fetch initial page data that could be fetched in a Server Component.",
      ],
    },
    // Tailwind + React
    {
      techs: ["tailwind", "react"],
      conventions: [
        {
          id: "tailwind-no-style-prop",
          description: "Tailwind over inline styles",
          rule: "Use Tailwind classes instead of style prop. Use cn() or clsx() for conditional classes.",
        },
        {
          id: "tailwind-component-variants",
          description: "Variant management",
          rule: "For components with many style variants, use cva (class-variance-authority) or a similar pattern.",
        },
      ],
      interdictions: [
        "NEVER mix Tailwind with inline styles unless for truly dynamic values (e.g., calculated positions).",
      ],
    },
    // Next.js + Drizzle
    {
      techs: ["next", "drizzle"],
      conventions: [
        {
          id: "next-drizzle-server-only",
          description: "Drizzle server-only",
          rule: "Import the Drizzle client ONLY in Server Components, Server Actions, and Route Handlers. Never in 'use client' files.",
        },
        {
          id: "next-drizzle-connection",
          description: "Connection pooling",
          rule: "Use a connection pool (e.g., @neondatabase/serverless with pool mode, or pg Pool) for serverless environments. Singleton pattern for the db client.",
        },
      ],
      interdictions: [
        "NEVER import drizzle-orm in client-side code.",
        "NEVER run migrations in production at runtime — run them in CI/CD.",
      ],
    },
    // Next.js + Clerk
    {
      techs: ["next", "clerk"],
      conventions: [
        {
          id: "next-clerk-middleware",
          description: "Clerk middleware",
          rule: "Use clerkMiddleware() in middleware.ts. Define public routes with createRouteMatcher(). All other routes are protected by default.",
        },
        {
          id: "next-clerk-server",
          description: "Server-side auth with Clerk",
          rule: "Use currentUser() or auth() from @clerk/nextjs/server in Server Components and Route Handlers. Use useUser() only in Client Components.",
        },
      ],
      interdictions: [
        "NEVER check auth client-side only with Clerk — always validate on the server.",
        "NEVER expose Clerk secret key in client code.",
      ],
    },
    // Next.js + Supabase Auth
    {
      techs: ["next", "supabase-auth"],
      conventions: [
        {
          id: "next-supabase-server-client",
          description: "Supabase server client",
          rule: "Create separate Supabase clients for server (createServerClient with cookies) and browser (createBrowserClient). Never share instances.",
        },
        {
          id: "next-supabase-middleware",
          description: "Supabase auth middleware",
          rule: "Use middleware.ts to refresh the Supabase session on every request. This prevents stale auth tokens.",
        },
      ],
      interdictions: [
        "NEVER use the browser Supabase client in Server Components.",
        "NEVER skip the middleware session refresh — it causes auth token expiration issues.",
      ],
    },
    // Next.js + Stripe
    {
      techs: ["next", "stripe"],
      conventions: [
        {
          id: "next-stripe-server-only",
          description: "Stripe SDK server-only",
          rule: "Import the Stripe Node SDK only in Server Actions and Route Handlers. Use @stripe/stripe-js for client-side (Stripe Elements, checkout redirect).",
        },
        {
          id: "next-stripe-webhooks",
          description: "Stripe webhooks",
          rule: "Handle Stripe webhooks in a Route Handler (app/api/webhooks/stripe/route.ts). Always verify the webhook signature. Use raw body parsing.",
        },
      ],
      interdictions: [
        "NEVER expose your Stripe secret key in client code.",
        "NEVER trust client-sent prices or product IDs — always verify on the server.",
        "NEVER skip webhook signature verification.",
      ],
    },
    // Next.js + next-intl
    {
      techs: ["next", "next-intl"],
      conventions: [
        {
          id: "next-intl-middleware",
          description: "i18n middleware",
          rule: "Configure next-intl middleware in middleware.ts for locale detection and routing. Define supported locales and default locale.",
        },
        {
          id: "next-intl-messages",
          description: "Message organization",
          rule: "Keep translations in messages/{locale}.json. Organize by namespace matching your app structure. Use useTranslations('namespace') in components.",
        },
        {
          id: "next-intl-server",
          description: "Server Components i18n",
          rule: "Use getTranslations() in Server Components, useTranslations() in Client Components. Never hardcode user-facing strings.",
        },
      ],
      interdictions: [
        "NEVER hardcode user-facing strings — always use translation functions.",
        "NEVER forget to add new strings to ALL locale files.",
      ],
    },
    // Prisma + NextAuth
    {
      techs: ["prisma", "next-auth"],
      conventions: [
        {
          id: "prisma-nextauth-adapter",
          description: "Prisma adapter for NextAuth",
          rule: "Use @auth/prisma-adapter. Ensure your Prisma schema includes the required models (User, Account, Session, VerificationToken).",
        },
        {
          id: "prisma-nextauth-session",
          description: "Session strategy",
          rule: "Use JWT strategy for serverless deployments (no DB lookup per request). Use database strategy only if you need server-side session revocation.",
        },
      ],
      interdictions: [
        "NEVER modify the NextAuth-required Prisma models (User, Account, Session) without checking adapter compatibility.",
      ],
    },
    // Express/Fastify + Prisma
    {
      techs: ["express", "prisma"],
      conventions: [
        {
          id: "express-prisma-singleton",
          description: "Prisma singleton in Express",
          rule: "Create a single PrismaClient instance in a dedicated module (e.g., lib/prisma.ts). Import it in route handlers. Disconnect in graceful shutdown.",
        },
        {
          id: "express-prisma-n-plus-1",
          description: "Prevent N+1 queries",
          rule: "Always use include/select to fetch related data in one query. Never loop over results and query for each item.",
        },
      ],
      interdictions: [
        "NEVER create a new PrismaClient per request — this exhausts database connections.",
      ],
    },
    {
      techs: ["fastify", "prisma"],
      conventions: [
        {
          id: "fastify-prisma-plugin",
          description: "Prisma as Fastify plugin",
          rule: "Register Prisma as a Fastify plugin with proper lifecycle hooks. Disconnect on server close.",
        },
      ],
      interdictions: [
        "NEVER create a new PrismaClient per request.",
      ],
    },
    // Tailwind + shadcn
    {
      techs: ["tailwind", "shadcn"],
      conventions: [
        {
          id: "shadcn-cn-utility",
          description: "cn() utility",
          rule: "Use the cn() utility (lib/utils.ts) for all className merging. It combines clsx and tailwind-merge.",
        },
        {
          id: "shadcn-customization",
          description: "Component customization",
          rule: "Customize shadcn components by editing the files in components/ui/. Extend with variants using cva. Never modify the core patterns.",
        },
        {
          id: "shadcn-composition",
          description: "Compose, don't modify",
          rule: "Build custom components by composing shadcn primitives. If you need a different variant, add it to the cva definition.",
        },
      ],
      interdictions: [
        "NEVER override shadcn component styles with inline styles or external CSS — use Tailwind classes and cva variants.",
        "NEVER copy-paste shadcn component code instead of using the CLI to add components.",
      ],
    },
  ],
};
