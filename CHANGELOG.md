# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `--version` flag to the CLI
- Colored CLI output for errors and success messages
- `CONTRIBUTING.md` with contribution guidelines
- `engines.bun` field in `package.json` (>=1.0.0)

### Changed
- Removed `--dir` option from all CLI commands; all commands now use the hardcoded `./slate` directory relative to CWD
- PRD status is now derived from child task statuses at read time (no longer persisted)
- Updated `taskUpdate` to accept `--title` for renaming tasks
- Added `files` field to `package.json` (ships `src/` and `README.md`)
- Added `LICENSE` file (Apache-2.0)
- Removed `bulb` git dependency from `devDependencies`

### Fixed
- Added warning log for corrupted entity files in `LocalFileStore`
- `Slate` constructor now throws `SlateConstructionError` on store failure instead of silently degrading

### Removed
- `detect-cycle.ts` dead code

## [0.1.0] — 2026-05-14

### Added
- Initial release
- `slate init` — initialize a `slate/` directory
- `slate overview` — display CLI help and usage examples
- `slate plan` — find the next actionable task via dependency resolution
- `slate prd create/list/show` — manage PRDs
- `slate task create/list/update/resolve/delete` — manage tasks
- Library API via `import { Slate } from "slate"`
- YAML frontmatter entity format with Zod validation
- Dependency index with cycle detection
- `Result<T, E>` error handling pattern throughout
- 142 passing tests (integration + unit)
