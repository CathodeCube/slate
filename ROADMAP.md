# Slate — Roadmap

## Phase 1: Foundation (current)

Core library and CLI for issue tracking.

- [x] **Data model** — PRD and Task types, validation, YAML frontmatter serialization (`src/prd/types.ts`, `src/task/types.ts`, Zod schemas in `LocalFileStore.ts`)
- [x] **Store** — single `IStore` interface with `LocalFileStore` implementation, handles both PRDs and tasks in `slate/prds/` and `slate/tasks/` (`src/store/IStore.ts`, `src/store/LocalFileStore.ts`)
- [x] **Library API** — CRUD operations, query/filter, dependency resolution (`PRDService`, `TaskService` with full CRUD, `taskList` with filter, `taskResolve` with unblocked detection, `Slate` facade class)
- [x] **CLI** — `slate prd` and `slate task` subcommands (`prd list/show/create`, `task list/update/create/resolve/delete`), `slate plan` (next actionable task), `slate init`, `slate overview`
- [x] **Result type** — `Result<T, E>` for all fallible operations (`src/utils/result.ts`)
- [x] **Tests** — integration-first, covering the library contract (`test/integration/`, `test/unit/` — 129 tests across slate, CLI, PRD, task, store validation, dependency-index, and entity-reader)

## Phase 2: Agentic Integration

Make Slate useful for AI agents.

- [ ] **Pi extension** — direct tool calls from Pi harness to Slate library
- [x] **Task discovery** — `taskList` filter available on library; `slate plan` CLI implemented
- [x] **Dependency-aware updates** — `taskResolve` marks task done and reports unblocked dependents; CLI `slate task resolve` implemented
- [x] **CLI workflows** — `slate plan` (show next actionable task) implemented

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
