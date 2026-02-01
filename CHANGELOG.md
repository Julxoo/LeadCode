# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-02-01

### Fixed

- Actually publish the suggest-conventions fix (0.1.1 was published before the fix was included)
- Fix README installation instructions — MCP config only, not standalone CLI
- Add release script

## [0.1.1] - 2026-02-01

### Fixed

- `suggest-conventions` now accepts both `{"gaps": [...]}` and `[...]` formats, fixing "gaps is not iterable" error when Claude passes the array directly

## [0.1.0] - 2026-02-01

### Added

- Initial release
- 6 MCP tools: `analyze-repo`, `detect-gaps`, `suggest-conventions`, `generate-claude-md`, `validate-claude-md`, `update-claude-md`
- 2 MCP prompts: `setup-project`, `validate-project`
- Stack detection across 22 categories (framework, ORM, auth, CSS, testing, i18n, payments, etc.)
- 13 rule modules with conventions, interdictions, and gap checks
- 18 cross-stack rules for technology combinations
- Code pattern analysis (client/server ratio, barrel files, path aliases, large files)
- Structured CLAUDE.md generation with 11 dynamic sections

[0.1.2]: https://github.com/Julxoo/LeadCode/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/Julxoo/LeadCode/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Julxoo/LeadCode/releases/tag/v0.1.0
