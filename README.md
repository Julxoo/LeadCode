# LeadCode

**Your virtual Lead Tech for Claude Code.** An MCP server that analyzes your codebase, detects structural gaps, and generates a tailored `CLAUDE.md` — so Claude Code understands your project like a senior engineer would.

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

**LeadCode fixes this.** It scans your project, detects what you're using, identifies what's missing, and generates a `CLAUDE.md` file that tells Claude Code exactly how to behave in your codebase.

## How It Works

```
Your Project ──→ LeadCode ──→ CLAUDE.md ──→ Claude Code knows your rules
```

1. **Analyze** — Scans `package.json`, directory structure, and source code patterns
2. **Detect** — Identifies your stack across 22 categories (framework, ORM, auth, CSS, testing, i18n, etc.)
3. **Find Gaps** — Detects structural issues (missing error boundaries, no test setup, no validation, etc.)
4. **Suggest** — Proposes options (simple / clean / scalable) for each gap, with pros, cons, and Claude impact
5. **Generate** — Writes a structured `CLAUDE.md` with conventions, interdictions, and cross-stack rules

## Installation

LeadCode is an MCP server — it's used through Claude Code, not as a standalone CLI.

Add LeadCode to your MCP config. Either globally in `~/.claude/claude_code_config.json`, or per-project in `.mcp.json`:

```json
{
  "mcpServers": {
    "leadcode": {
      "command": "npx",
      "args": ["-y", "leadcode"]
    }
  }
}
```

Then restart Claude Code. LeadCode's tools will be available automatically.

## Usage

### Quick Start (Recommended)

Use the built-in prompt in Claude Code:

```
Use the setup-project prompt with /path/to/your/project
```

This walks through the full workflow: analyze → detect gaps → suggest fixes → ask your preferences → generate `CLAUDE.md`.

### Manual Tool Usage

Each tool can be called individually:

#### `analyze-repo`
Scans a project and returns structured facts — framework, dependencies, directory structure, detected stack.

```
Call analyze-repo with projectPath: /path/to/project
```

#### `detect-gaps`
Takes the analysis output and identifies structural gaps (missing error handling, no tests, no validation schemas, etc.).

#### `suggest-conventions`
Proposes options for each gap. Each suggestion includes:
- **Simple** — Minimal setup, quick wins
- **Clean** — Best practices, good DX
- **Scalable** — Full setup for large projects

#### `generate-claude-md`
Generates and writes `CLAUDE.md` to the project root based on the analysis and your choices.

#### `validate-claude-md`
Checks if an existing `CLAUDE.md` is still in sync with the project. Detects drifts after adding dependencies or changing structure.

#### `update-claude-md`
Re-analyzes and regenerates `CLAUDE.md` while preserving your choices from the "Project Decisions" section.

## What Gets Detected

### Frameworks
Next.js (App/Pages Router), Nuxt, Remix, Astro, SvelteKit, SolidStart, Vite+React, Express, Fastify, Hono

### Stack (22 categories)

| Category | Examples |
|----------|----------|
| ORM | Prisma, Drizzle, TypeORM, Mongoose, Kysely |
| Auth | NextAuth, Clerk, Lucia, Supabase Auth, Auth0, Kinde |
| Validation | Zod, Yup, Joi, Valibot |
| CSS | Tailwind, styled-components, Emotion, PandaCSS |
| UI Components | shadcn (auto-detected), Radix, MUI, Chakra, Headless UI |
| Testing | Vitest, Jest, Playwright, Cypress |
| State | Zustand, Redux, Jotai, Valtio, XState |
| i18n | next-intl, i18next |
| Payments | Stripe, LemonSqueezy |
| CMS | Contentlayer, MDX, Sanity, Notion |
| Email | Resend, Nodemailer, SendGrid |
| File Upload | UploadThing, Vercel Blob, Multer, S3 |
| Realtime | Socket.io, Pusher, Ably |
| Jobs | BullMQ, Inngest, Trigger.dev |
| Database | PostgreSQL, MySQL, SQLite, MongoDB, Supabase |
| Monorepo | Turborepo, Nx, Lerna |
| Deployment | Vercel, Netlify, Docker, Fly.io, Railway |
| Runtime | Node, Bun, Deno |

### Code Patterns
- Client/Server component ratio
- `'use server'` file count
- Path alias usage (`@/` or `~/`)
- Barrel file patterns
- Large files (>300 lines)
- `console.log` count

## What Gets Generated

The `CLAUDE.md` includes up to 11 sections, all tailored to your stack:

1. **Architecture Overview** — Framework, data layer, auth, project size
2. **Stack** — All detected technologies
3. **Project Structure** — Directories, special files
4. **Available Scripts** — `npm run` commands
5. **File & Naming Conventions** — kebab-case, PascalCase rules
6. **Import Ordering** — Node builtins → external → internal → relative → types
7. **Conventions** — Stack-specific rules Claude must follow
8. **Cross-Stack Rules** — Rules for technology combinations (e.g., Next.js + Prisma)
9. **Interdictions** — Things Claude must never do
10. **Existing Code Patterns** — Patterns detected in your code to respect
11. **Claude Code Instructions** — Dynamic instructions based on your stack

### Cross-Stack Rules (18 combinations)

LeadCode generates specific rules for technology pairs:

`next + prisma` · `next + drizzle` · `next + next-auth` · `next + clerk` · `next + supabase-auth` · `next + trpc` · `next + stripe` · `next + next-intl` · `next + react-query` · `next + zod` · `prisma + next-auth` · `prisma + zod` · `trpc + zod` · `express + prisma` · `fastify + prisma` · `tailwind + shadcn` · `tailwind + react`

## Requirements

- **Node.js** >= 18
- The target project must have a `package.json`
- Currently optimized for JavaScript/TypeScript projects

## Limitations

- **JS/TS only** — No support for Python, Go, Rust, etc.
- **Single package.json** — Monorepo support detects the tool but analyzes only the root
- **No lint config reading** — Detects ESLint/Biome but doesn't parse their rules
- **No CI/CD detection** — GitHub Actions, etc. are not analyzed
- **No test quality analysis** — Detects the runner but doesn't evaluate test coverage

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) - Copyright (c) 2026 Jules Toussenel
