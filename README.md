# LeadCode

**Your virtual Lead Tech for Claude Code.** An MCP server that analyzes your codebase, then guides Claude to fetch up-to-date documentation via [Context7](https://context7.com) and community best practices via WebSearch — producing a tailored, concise `CLAUDE.md` so Claude Code understands your project like a senior engineer would.

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

**LeadCode fixes this.** It scans your project, detects your stack, and orchestrates Claude to fetch official docs + community best practices for each technology — then synthesizes everything into a compact `CLAUDE.md` with actionable rules.

## How It Works

```
Your Project ──→ LeadCode (analyze) ──→ Claude reads tech-queries resource
                                          ↓
                              Context7 MCP (official docs × N techs)
                              WebSearch (best practices, architecture, gotchas)
                                          ↓
                              Claude synthesizes 3-5 rules per tech
                                          ↓
                              LeadCode (generate) ──→ CLAUDE.md
```

1. **Analyze** — Scans `package.json`, directory structure, and source code patterns
2. **Detect** — Identifies your stack across 25+ categories (framework, ORM, auth, CSS, testing, i18n, etc.)
3. **Fetch & Synthesize** — Claude reads the tech-queries mapping, calls Context7 for official docs and WebSearch for community knowledge, then synthesizes into concise actionable rules
4. **Generate** — Writes a structured `CLAUDE.md` (~100-150 lines) with version-specific conventions

## Installation

LeadCode requires **two MCP servers**: LeadCode itself and Context7 (for documentation fetching).

```bash
claude mcp add --scope project leadcode -- npx -y leadcode@latest
claude mcp add --scope project context7 -- npx -y @upstash/context7-mcp@latest
```

Restart Claude Code and you're ready.

> Use `--scope user` instead of `--scope project` to install globally across all your projects.

## Usage

### Quick Start (Recommended)

Use the built-in prompt in Claude Code:

```
Use the setup-project prompt with /path/to/your/project
```

This walks through the full workflow: analyze → fetch docs → synthesize → generate `CLAUDE.md`.

Or simply ask naturally:

```
Generate a CLAUDE.md for this project
```

### Available Tools

#### `analyze-repo`
Scans a project and returns structured facts — framework, dependencies, directory structure, detected stack.

#### `generate-claude-md`
Generates and writes `CLAUDE.md` to the project root. Accepts pre-synthesized documentation from Claude's orchestration of Context7 + WebSearch.

#### `validate-claude-md`
Checks if an existing `CLAUDE.md` is still in sync with the project. Detects drifts after adding dependencies or changing structure.

### Available Prompts

- **`setup-project`** — Full workflow to generate a CLAUDE.md from scratch
- **`update-project`** — Re-analyzes and regenerates while preserving your Project Decisions
- **`validate-project`** — Checks if your CLAUDE.md is still up to date

### Resources

- **`leadcode://tech-queries`** — Mapping of detected technologies to Context7 library names and recommended queries. Used by Claude during the orchestration flow.

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
| Runtime | Node, Bun, Deno |

### Code Patterns & Conventions (auto-detected)
- Client/Server component ratio
- `'use server'` file count
- Path alias usage (`@/` or `~/`)
- Barrel file patterns
- File naming style (kebab-case, camelCase, PascalCase, snake_case)
- Import order pattern
- Indentation (tabs vs spaces, 2 or 4)
- Quote style (single vs double)
- React/hooks presence (conventions only shown when detected)

## What Gets Generated

The `CLAUDE.md` is organized into:

1. **Architecture Overview** — Framework, data layer, auth, project size, structure, scripts, code patterns
2. **Per-Technology Sections** — 3-5 concise, actionable rules per tech (from Context7 official docs + WebSearch)
3. **Cross-Stack Conventions** — Unified rules for how all detected technologies work together
4. **Conventions** — 100% auto-detected from your codebase (naming, imports, indentation, quotes, React conventions only if React is used)
5. **Project Decisions** — User choices preserved across regenerations

## Requirements

- **Node.js** >= 18
- **Context7 MCP server** installed alongside LeadCode (for documentation fetching)
- The target project must have a `package.json`
- Currently optimized for JavaScript/TypeScript projects

## Limitations

- **JS/TS only** — No support for Python, Go, Rust, etc.
- **Single package.json** — Monorepo support detects the tool but analyzes only the root
- **No lint config reading** — Detects ESLint/Biome but doesn't parse their rules
- **No CI/CD detection** — GitHub Actions, etc. are not analyzed

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) - Copyright (c) 2026 Jules Toussenel
