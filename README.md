# LeadCode

**Your virtual Lead Tech for Claude Code.** An MCP server that analyzes your codebase, fetches up-to-date documentation for each detected technology via [Context7](https://context7.com), and generates a tailored `CLAUDE.md` — so Claude Code understands your project like a senior engineer would.

[![npm version](https://img.shields.io/npm/v/leadcode.svg)](https://www.npmjs.com/package/leadcode)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

---

## Why LeadCode?

Claude Code is powerful, but its output quality depends on context. Without clear project rules, Claude will:
- Mix up App Router and Pages Router patterns
- Create files in the wrong locations
- Ignore your validation library and hand-write `if/else` checks
- Forget auth checks on new routes
- Use inline styles when your project uses Tailwind

**LeadCode fixes this.** It scans your project, detects what you're using, fetches the latest documentation for each technology, cross-references them, and generates a `CLAUDE.md` file that tells Claude Code exactly how to behave in your codebase.

## How It Works

```
Your Project ──→ LeadCode (detect stack) ──→ Context7 (fetch docs) ──→ CLAUDE.md
```

1. **Analyze** — Scans `package.json`, directory structure, and source code patterns
2. **Detect** — Identifies your stack across 25+ categories (framework, ORM, auth, CSS, testing, i18n, etc.)
3. **Fetch Docs** — Queries Context7 API for up-to-date documentation of each detected technology, including cross-technology best practices (e.g., "how to use Prisma with Next.js App Router")
4. **Generate** — Writes a structured `CLAUDE.md` with real, version-specific conventions from official docs

## Installation

LeadCode requires **two MCP servers**: LeadCode itself and Context7 (for documentation fetching).

**Two commands:**

```bash
claude mcp add --scope project leadcode -- npx -y leadcode@latest
claude mcp add --scope project context7 -- npx -y @upstash/context7-mcp@latest
```

Restart Claude Code and you're ready.

> Use `--scope user` instead of `--scope project` to install globally across all your projects.

**Optional:** Set a Context7 API key for higher rate limits (free tier works without it):

```bash
export CONTEXT7_API_KEY=your_key_here
```

Get a key at [context7.com/dashboard](https://context7.com/dashboard).

## Usage

### Quick Start (Recommended)

Use the built-in prompt in Claude Code:

```
Use the setup-project prompt with /path/to/your/project
```

This walks through the full workflow: analyze → fetch docs → generate `CLAUDE.md`.

### Manual Tool Usage

Each tool can be called individually:

#### `analyze-repo`
Scans a project and returns structured facts — framework, dependencies, directory structure, detected stack.

```
Call analyze-repo with projectPath: /path/to/project
```

#### `fetch-docs`
Takes the analysis output and fetches up-to-date documentation from Context7 for each detected technology. Also fetches cross-technology docs (e.g., Next.js + Prisma best practices).

#### `generate-claude-md`
Generates and writes `CLAUDE.md` to the project root based on the analysis and fetched documentation.

#### `validate-claude-md`
Checks if an existing `CLAUDE.md` is still in sync with the project. Detects drifts after adding dependencies or changing structure.

#### `update-claude-md`
Re-analyzes the project, re-fetches documentation, and regenerates `CLAUDE.md` while preserving your choices from the "Project Decisions" section.

## What Gets Detected

### Frameworks
Next.js (App/Pages Router), Nuxt, Remix, Astro, SvelteKit, SolidStart, Vite+React, React, Express, Fastify, Hono

### Stack (25+ categories)

| Category | Examples |
|----------|----------|
| ORM | Prisma, Drizzle, TypeORM, MikroORM, Mongoose, Kysely, Sequelize |
| Auth | NextAuth, Clerk, Lucia, Supabase Auth, Auth0, Kinde, Better Auth |
| Validation | Zod, Yup, Joi, Valibot, ArkType |
| CSS | Tailwind, Chakra, MUI, styled-components, Emotion, Panda, Mantine, Ant Design |
| UI Components | shadcn (auto-detected), Radix, Headless UI, NextUI, Tremor |
| Testing | Vitest, Jest, Playwright, Cypress |
| State | Zustand, Redux, Jotai, Valtio, XState, Recoil, MobX |
| Data Fetching | TanStack Query, SWR |
| Forms | React Hook Form, Formik, TanStack Form |
| i18n | next-intl, i18next, Lingui, react-intl |
| Payments | Stripe, LemonSqueezy |
| CMS | Contentlayer, MDX, Sanity, Notion, Contentful, Strapi |
| Email | Resend, Nodemailer, SendGrid, Postmark, React Email |
| File Upload | UploadThing, Vercel Blob, Multer, S3 |
| Realtime | Socket.io, Pusher, Ably |
| Jobs | BullMQ, Inngest, Trigger.dev |
| Database | PostgreSQL, MySQL, SQLite, MongoDB, Supabase, PlanetScale, Redis |
| API Style | tRPC, GraphQL |
| Monorepo | Turborepo, Nx, Lerna |
| Deployment | Vercel |
| Runtime | Node, Bun, Deno |

### Code Patterns
- Client/Server component ratio
- `'use server'` file count
- Path alias usage (`@/` or `~/`)
- Barrel file patterns
- Large files (>300 lines)
- `console.log` count

## What Gets Generated

The `CLAUDE.md` includes sections tailored to your stack:

1. **Architecture Overview** — Framework, data layer, auth, project size
2. **Stack** — All detected technologies with versions
3. **Project Structure** — Directories, special files
4. **Available Scripts** — `npm run` commands
5. **Per-Technology Conventions** — Up-to-date best practices from official docs (via Context7)
6. **Cross-Stack Rules** — Best practices for technology combinations (e.g., Next.js + Prisma, Zod + react-hook-form)
7. **File & Naming Conventions** — kebab-case, PascalCase rules
8. **Import Ordering** — Node builtins → external → internal → relative → types
9. **Existing Code Patterns** — Patterns detected in your code to respect
10. **Claude Code Instructions** — Dynamic instructions based on your stack

### Cross-Technology Documentation

LeadCode fetches specific documentation for technology pairs detected in your project:

`next + prisma` · `next + drizzle` · `next + next-auth` · `next + clerk` · `next + supabase-auth` · `next + zod` · `next + stripe` · `next + react-query` · `next + next-intl` · `next + tailwind` · `next + shadcn` · `zod + react-hook-form` · `trpc + zod` — and more.

## Requirements

- **Node.js** >= 18
- **Context7 MCP server** installed alongside LeadCode
- The target project must have a `package.json`
- Currently optimized for JavaScript/TypeScript projects

## Limitations

- **JS/TS only** — No support for Python, Go, Rust, etc.
- **Single package.json** — Monorepo support detects the tool but analyzes only the root
- **No lint config reading** — Detects ESLint/Biome but doesn't parse their rules
- **No CI/CD detection** — GitHub Actions, etc. are not analyzed
- **Requires Context7** — Documentation quality depends on Context7's library coverage

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) - Copyright (c) 2026 Jules Toussenel
