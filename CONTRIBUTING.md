# Contributing to LeadCode

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/Julxoo/LeadCode.git
cd LeadCode
npm install
npm run build
```

### Running locally

```bash
# Build and watch for changes
npm run dev

# Test with a project
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"analyze-repo","arguments":{"projectPath":"/path/to/project"}}}' | node dist/index.js
```

## Project Structure

```
src/
  index.ts                  # MCP server entry, tool + prompt registration
  types.ts                  # All shared types
  analyzers/
    constants.ts            # Shared constants (IGNORE_DIRS, SOURCE_EXTS)
    dependencies.ts         # package.json parser
    detection.ts            # Framework + stack detection (22 categories)
    structure.ts            # Directory/file structure analysis
    patterns.ts             # Source code pattern analysis
  rules/
    index.ts                # Rule registry + aggregation
    nextjs.ts               # Next.js App/Pages Router rules
    react.ts                # React rules
    node.ts                 # Express/Fastify/Hono rules
    prisma.ts               # Prisma rules
    drizzle.ts              # Drizzle rules
    auth.ts                 # Auth rules
    validation.ts           # Validation rules
    typescript.ts           # TypeScript rules
    tailwind.ts             # Tailwind rules
    state.ts                # State management rules
    trpc.ts                 # tRPC rules
    cross-stack.ts          # Cross-stack combination rules (18 combos)
  templates/
    claude-md.ts            # CLAUDE.md template generator
  tools/
    analyze-repo.ts         # analyze-repo tool
    detect-gaps.ts          # detect-gaps tool
    suggest.ts              # suggest-conventions tool
    generate-claude-md.ts   # generate-claude-md tool
    validate-claude-md.ts   # validate-claude-md tool
    update-claude-md.ts     # update-claude-md tool
```

## How to Contribute

### Adding a new detection

1. Add the detection logic in `src/analyzers/detection.ts` (in the appropriate category)
2. If it's a new category, add the field to `DetectedStack` in `src/types.ts`
3. Update `src/templates/claude-md.ts` to display it in the Stack section

### Adding a new rule module

1. Create `src/rules/your-rule.ts` following the `Rule` interface
2. Export it and register in `src/rules/index.ts`
3. Add gap suggestions in `src/tools/suggest.ts` if your rule has gaps

### Adding a cross-stack rule

Add an entry to the `crossRefs` array in `src/rules/cross-stack.ts`. Make sure the `techs` array uses values that appear in the tech set (framework names, detected values).

## Guidelines

- TypeScript strict mode — no `any` without justification
- Keep rules factual and practical — no vague advice
- Each convention must have a concrete `rule` string that Claude Code can follow
- Test your changes against a real project before submitting
- Run `npm run build` and verify it compiles cleanly

## Pull Requests

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `npm run build` — it must compile without errors
4. Test against at least one real project
5. Submit a PR with a clear description of what you changed and why

## Reporting Issues

Open an issue on [GitHub](https://github.com/Julxoo/LeadCode/issues) with:
- What you expected to happen
- What actually happened
- The project setup that triggered the issue (framework, relevant dependencies)
