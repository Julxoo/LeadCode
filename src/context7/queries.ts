export interface TechQuery {
  libraryName: string;
  queries: string[];
  crossQueries?: Record<string, string>;
}

/**
 * Maps detected tech identifiers to Context7 library names and relevant queries.
 * This is NOT hardcoded rules — just "what to ask" for each technology.
 */
export const TECH_QUERIES: Record<string, TechQuery> = {
  // Frameworks
  next: {
    libraryName: "next.js",
    queries: [
      "App Router conventions, Server Components vs Client Components, when to use 'use client'",
      "Server Actions best practices, data fetching patterns, caching strategies",
    ],
    crossQueries: {
      prisma: "Using Prisma with Next.js App Router, server-only imports, singleton pattern, data access layer",
      drizzle: "Using Drizzle ORM with Next.js, server-only database queries",
      "next-auth": "NextAuth.js v5 setup with Next.js App Router, middleware auth, session in Server Components",
      clerk: "Clerk authentication with Next.js App Router, middleware, server-side auth",
      "supabase-auth": "Supabase Auth with Next.js App Router, server client, middleware session refresh",
      zod: "Zod validation in Next.js Server Actions and Route Handlers",
      stripe: "Stripe payments and webhooks in Next.js, server-only SDK, webhook route handler",
      "react-query": "React Query with Next.js App Router, HydrationBoundary, prefetching in Server Components",
      "next-intl": "next-intl setup with App Router, middleware locale detection, Server Components i18n",
      tailwind: "Tailwind CSS with Next.js, configuration, dark mode",
      shadcn: "shadcn/ui with Next.js, component installation, theming",
    },
  },
  nuxt: {
    libraryName: "nuxt",
    queries: ["Nuxt 3 conventions, composables, server routes, auto-imports"],
  },
  remix: {
    libraryName: "remix",
    queries: ["Remix loaders and actions, data loading patterns, form handling"],
  },
  astro: {
    libraryName: "astro",
    queries: ["Astro components, islands architecture, content collections"],
  },
  sveltekit: {
    libraryName: "sveltekit",
    queries: ["SvelteKit load functions, form actions, server-side rendering"],
  },
  "solid-start": {
    libraryName: "solid-start",
    queries: ["SolidStart routing, server functions, data loading"],
  },
  "vite-react": {
    libraryName: "vite",
    queries: ["Vite React project configuration, plugins, build optimization"],
  },
  react: {
    libraryName: "react",
    queries: ["React hooks best practices, component patterns, performance optimization"],
  },
  express: {
    libraryName: "express",
    queries: ["Express.js middleware patterns, error handling, route organization"],
  },
  fastify: {
    libraryName: "fastify",
    queries: ["Fastify plugins, schema validation, hooks lifecycle"],
  },
  hono: {
    libraryName: "hono",
    queries: ["Hono middleware, routing, request handling patterns"],
  },

  // ORM / Database
  prisma: {
    libraryName: "prisma",
    queries: ["Prisma client singleton, connection pooling, best practices, select vs include"],
  },
  drizzle: {
    libraryName: "drizzle-orm",
    queries: ["Drizzle ORM schema definition, queries, migrations, best practices"],
  },
  typeorm: {
    libraryName: "typeorm",
    queries: ["TypeORM entity patterns, repository pattern, migrations"],
  },
  kysely: {
    libraryName: "kysely",
    queries: ["Kysely query builder patterns, type-safe queries"],
  },
  mongoose: {
    libraryName: "mongoose",
    queries: ["Mongoose schema design, middleware, connection management"],
  },

  // Auth
  "next-auth": {
    libraryName: "next-auth",
    queries: ["NextAuth.js v5 configuration, providers, session management, middleware"],
  },
  clerk: {
    libraryName: "clerk",
    queries: ["Clerk authentication setup, middleware, server-side auth, user management"],
  },
  "better-auth": {
    libraryName: "better-auth",
    queries: ["Better Auth setup, session management, providers"],
  },
  auth0: {
    libraryName: "auth0",
    queries: ["Auth0 SDK setup, authentication flow, token management"],
  },

  // Validation
  zod: {
    libraryName: "zod",
    queries: ["Zod schema patterns, parse vs safeParse, type inference, error handling"],
    crossQueries: {
      "react-hook-form": "Zod resolver with react-hook-form, shared schemas for forms and API validation",
    },
  },
  valibot: {
    libraryName: "valibot",
    queries: ["Valibot schema validation, tree-shaking, type inference"],
  },

  // CSS / UI
  tailwind: {
    libraryName: "tailwindcss",
    queries: ["Tailwind CSS utility classes, configuration, responsive design, dark mode"],
  },
  shadcn: {
    libraryName: "shadcn/ui",
    queries: ["shadcn/ui component usage, theming, customization, cn utility"],
  },
  chakra: {
    libraryName: "chakra-ui",
    queries: ["Chakra UI component patterns, theming, responsive styles"],
  },
  mui: {
    libraryName: "material-ui",
    queries: ["Material UI component usage, theming, sx prop patterns"],
  },
  mantine: {
    libraryName: "mantine",
    queries: ["Mantine components, hooks, theming, form handling"],
  },

  // Testing
  vitest: {
    libraryName: "vitest",
    queries: ["Vitest testing patterns, mocking, setup, configuration"],
  },
  jest: {
    libraryName: "jest",
    queries: ["Jest testing patterns, mocking, configuration, best practices"],
  },
  playwright: {
    libraryName: "playwright",
    queries: ["Playwright E2E testing, page objects, assertions, configuration"],
  },
  cypress: {
    libraryName: "cypress",
    queries: ["Cypress E2E testing, commands, fixtures, best practices"],
  },

  // State
  zustand: {
    libraryName: "zustand",
    queries: ["Zustand store patterns, middleware, persist, selectors"],
  },
  redux: {
    libraryName: "redux-toolkit",
    queries: ["Redux Toolkit slices, createAsyncThunk, RTK Query"],
  },
  jotai: {
    libraryName: "jotai",
    queries: ["Jotai atom patterns, derived atoms, async atoms"],
  },

  // Data fetching
  "react-query": {
    libraryName: "tanstack-query",
    queries: ["TanStack Query patterns, mutations, invalidation, caching strategies"],
  },
  swr: {
    libraryName: "swr",
    queries: ["SWR data fetching, revalidation, mutation, error handling"],
  },

  // Forms
  "react-hook-form": {
    libraryName: "react-hook-form",
    queries: ["React Hook Form usage, register, Controller, validation integration"],
  },

  // API
  trpc: {
    libraryName: "trpc",
    queries: ["tRPC router setup, procedures, middleware, input validation with Zod"],
    crossQueries: {
      zod: "tRPC with Zod input validation, end-to-end type safety",
    },
  },

  // Payments
  stripe: {
    libraryName: "stripe",
    queries: ["Stripe API integration, webhooks, checkout, payment intents"],
  },

  // Email
  resend: {
    libraryName: "resend",
    queries: ["Resend email API, sending emails, React Email templates"],
  },

  // i18n
  "next-intl": {
    libraryName: "next-intl",
    queries: ["next-intl middleware, Server Components, message organization"],
  },
  i18next: {
    libraryName: "i18next",
    queries: ["i18next configuration, namespaces, interpolation, react-i18next"],
  },

  // CMS
  sanity: {
    libraryName: "sanity",
    queries: ["Sanity CMS setup, GROQ queries, studio configuration"],
  },
  contentful: {
    libraryName: "contentful",
    queries: ["Contentful API, content delivery, content management"],
  },

  // Realtime
  "socket.io": {
    libraryName: "socket.io",
    queries: ["Socket.IO setup, events, rooms, namespaces, error handling"],
  },

  // Jobs
  inngest: {
    libraryName: "inngest",
    queries: ["Inngest function patterns, event-driven workflows, retries"],
  },
};
