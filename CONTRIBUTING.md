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
  index.ts                  # MCP server entry, tool + prompt + resource registration
  types.ts                  # All shared types (RepoAnalysis, FetchedDocs, etc.)
  analyzers/
    constants.ts            # Shared constants (IGNORE_DIRS, SOURCE_EXTS)
    dependencies.ts         # package.json parser
    detection.ts            # Framework + stack detection (23+ categories)
    structure.ts            # Directory/file structure analysis
    patterns.ts             # Code pattern analysis (naming, indentation, quotes, imports)
  data/
    tech-queries.ts         # Context7 library mappings for 40+ technologies
  i18n/
    types.ts                # Locale + Messages interfaces
    en.ts                   # English messages
    fr.ts                   # French messages
    index.ts                # i18n utilities (getMessages, interpolate)
  resources/
    tech-queries.ts         # MCP resource: leadcode://tech-queries
  templates/
    claude-md.ts            # CLAUDE.md template generator
  tools/
    analyze-repo.ts         # analyze-repo tool
    generate-claude-md.ts   # generate-claude-md tool (with orchestration workflow)
    validate-claude-md.ts   # validate-claude-md tool
```

## How to Contribute

### Adding a new technology detection

1. Add the detection logic in `src/analyzers/detection.ts` (in the appropriate category)
2. If it's a new category, add the field to `DetectedStack` in `src/types.ts`
3. Add a Context7 mapping in `src/data/tech-queries.ts` (library name + queries)
4. Add a display name in `src/templates/claude-md.ts` (`techDisplayName`)

### Adding a new framework

1. Add detection in `detectFramework()` in `src/analyzers/detection.ts`
2. Add a Context7 mapping in `src/data/tech-queries.ts`
3. Add relevant structure checks in `src/analyzers/structure.ts` if needed

### Adding i18n translations

1. Add keys to `src/i18n/types.ts`
2. Add English values in `src/i18n/en.ts`
3. Add French values in `src/i18n/fr.ts`
4. Keep both files in sync — same keys, same structure

## Guidelines

- TypeScript strict mode — no `any` without justification
- Keep the codebase lean — LeadCode has only 2 runtime dependencies
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
