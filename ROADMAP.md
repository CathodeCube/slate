# Slate — Roadmap

## Phase 1: Foundation (current)

Core library and CLI for issue tracking.

- [ ] **Data model** — PRD and Task types, validation, YAML frontmatter serialization
- [ ] **Store** — single `IStore` interface with `LocalFileStore` implementation, handles both PRDs and tasks in `slate/prds/` and `slate/tasks/`
- [ ] **Library API** — CRUD operations, query/filter, dependency resolution
- [ ] **CLI** — `slate prd` and `slate task` subcommands
- [x] **Result type** — `Result<T, E>` for all fallible operations (already exists in `src/utils/result.ts`)
- [ ] **Tests** — integration-first, covering the library contract

## Phase 2: Agentic Integration

Make Slate useful for AI agents.

- [ ] **Pi extension** — direct tool calls from Pi harness to Slate library
- [ ] **Task discovery** — query actionable tasks (unblocked, highest priority)
- [ ] **Dependency-aware updates** — auto-resolve dependencies when tasks complete
- [ ] **CLI workflows** — `slate plan` (show next actionable task), `slate resolve` (mark done + unblock deps)

## Phase 3: Polish & Visibility

Make Slate good for humans too.

- [ ] **TUI** — terminal UI for browsing PRDs and tasks
- [ ] **Graph view** — dependency visualization
- [ ] **Extensions API** — documented plugin system for harness-specific integrations
- [ ] **`slate install <extension>`** — extension discovery and installation

## Phase 4: Scale (if needed)

Optimize for larger stores.

- [ ] **`slate/index.json`** — fast-lookup index, kept in sync with file store
- [ ] **Incremental scanning** — only re-read changed entities
- [ ] **Project-level config** — `slate/config.json` for store path, defaults, etc.

## Out of Scope

- Remote hosting or sync
- User accounts or permissions
- Time tracking or estimates
- Epics, milestones, or other hierarchy levels
- Automation or triggers
