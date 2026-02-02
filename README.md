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
Your Project ──→ LeadCode (analyze) ──→ Claude orchestrates
                                          ↓
                              Context7 MCP (official docs × N techs)
                              WebSearch (best practices, architecture, gotchas)
                                          ↓
                              Claude synthesizes 3-5 rules per tech
                                          ↓
                              LeadCode (generate) ──→ CLAUDE.md
```

1. **Analyze** — Scans project manifests (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, `composer.json`), directory structure, and source code patterns
2. **Detect** — Identifies your stack across 25+ categories (framework, ORM, auth, CSS, testing, i18n, etc.)
3. **Fetch & Synthesize** — Claude calls Context7 for official docs and WebSearch for community knowledge, then synthesizes into concise actionable rules
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

## Supported Ecosystems

| Ecosystem | Manifest | Frameworks | Stack rules |
|-----------|----------|------------|-------------|
| **JavaScript/TypeScript** | `package.json` | Next.js, Nuxt, Remix, Astro, SvelteKit, Express, Fastify, Hono | ~120 rules |
| **Python** | `pyproject.toml`, `requirements.txt`, `Pipfile`, `setup.py` | Django, Flask, FastAPI, Starlette, Litestar, Sanic, Tornado | ~60 rules |
| **Rust** | `Cargo.toml` | Actix-web, Axum, Rocket, Warp, Tide, Poem, Hyper | ~35 rules |
| **Go** | `go.mod` | Gin, Echo, Fiber, Chi, Gorilla/mux, httprouter | ~25 rules |
| **Java/Kotlin** | `pom.xml`, `build.gradle`, `build.gradle.kts` | Spring Boot, Quarkus, Micronaut, Vert.x, Javalin | ~35 rules |
| **PHP** | `composer.json` | Laravel, Symfony, Slim, CodeIgniter, CakePHP, Yii2 | ~90 rules |

## What Gets Detected

### Stack (25+ categories)

| Category | Examples |
|----------|----------|
| ORM | Prisma, Drizzle, Eloquent, Doctrine, Hibernate, Diesel, GORM |
| Auth | NextAuth, Sanctum, Symfony Security, Spring Security, JWT |
| Validation | Zod, Pydantic, Bean Validation, Symfony Validator |
| CSS/UI | Tailwind, shadcn, Chakra, MUI, Livewire, Inertia, Twig |
| Testing | Vitest, Jest, PHPUnit, Pest, pytest, testify, JUnit5 |
| Logging | Winston, Monolog, Tracing, Zap, SLF4J |
| API | tRPC, GraphQL, API Platform, gRPC, Swagger |
| Database | PostgreSQL, Redis, MongoDB, SQLx, pgx, Predis |
| Jobs | BullMQ, Horizon, Symfony Messenger, Celery, Spring Kafka |
| Observability | Sentry, Telescope, Debugbar, OpenTelemetry, Micrometer |
| Admin | Filament, Nova, EasyAdmin, Sonata Admin |
| And more... | Email, File Upload, Payments, Realtime, CMS, i18n, CLI, Config |

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

1. **Workflow** — Behavioral rules for Claude Code (research before coding, plan mode for non-trivial changes)
2. **Architecture Overview** — Framework, data layer, auth, project size, structure, scripts, code patterns
3. **Per-Technology Sections** — 3-5 concise, actionable rules per tech (from Context7 official docs + WebSearch)
4. **Cross-Stack Conventions** — Unified rules for how all detected technologies work together
5. **Conventions** — 100% auto-detected from your codebase (naming, imports, indentation, quotes, React conventions only if React is used)
6. **Project Decisions** — User choices preserved across regenerations

## Requirements

- **Node.js** >= 18
- **Context7 MCP server** installed alongside LeadCode (for documentation fetching)
- The target project must have a recognized manifest file (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, `build.gradle`, `composer.json`, `Gemfile`)

## Limitations

- **Ruby not yet supported** — Detected but no adapter implemented yet
- **Single manifest** — Monorepo support detects the tool but analyzes only the root
- **No multi-ecosystem projects** — Hybrid projects (e.g. JS frontend + Python backend) not yet supported
- **No lint config reading** — Detects ESLint/Biome/PHPStan but doesn't parse their rules
- **No CI/CD detection** — GitHub Actions, etc. are not analyzed

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) - Copyright (c) 2026 Jules Toussenel
