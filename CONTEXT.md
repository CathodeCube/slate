# Slate — Context

## Domain Glossary

### PRD (Product Requirements Document)

A named collection of tasks that define a feature or initiative. A PRD captures the "what" and "why" — the requirements, context, and rationale. Tasks are the "how."

- **Owned by**: A PRD is a top-level entity. It is not nested inside anything else.
- **Lifecycle**: A PRD has a status (`todo`, `in-progress`, `done`, `blocked`) that reflects the aggregate state of its tasks.
- **Not bound to anything**: A PRD is a root entity. Tasks reference their PRD, but a PRD does not reference tasks directly — tasks are discovered by querying.

### Task

The fundamental unit of work in Slate. A task represents a single, actionable piece of work.

- **Has an ID**: Every task has a unique, stable ID (e.g., `task-001`).
- **References its PRD**: A task stores its parent PRD's ID for navigation and grouping. A task may also exist without a PRD (ad-hoc task).
- **Has dependencies**: A task can depend on other tasks by ID. A task is actionable only when all its dependencies are `done`.
- **Has status**: One of `todo`, `in-progress`, `done`, `blocked`.
- **Has priority**: One of `high`, `medium`, `low`.

### Status

| Value | Meaning |
|-------|---------|
| `todo` | Not started. The task is ready to be worked on once dependencies are satisfied. |
| `in-progress` | Currently being worked on. |
| `done` | Completed. Dependencies can now be satisfied. |
| `blocked` | Cannot proceed due to an external dependency or decision. |

### Priority

| Value | Meaning |
|-------|---------|
| `high` | Should be done soon. Blocks other work. |
| `medium` | Important but not urgent. |
| `low` | Nice to have. Do when capacity allows. |

### Dependency

A directed relationship between two tasks: `task A depends on task B` means A cannot be started until B is `done`. Dependencies are stored as an array of task IDs.

- **Cycles are invalid**: The system must detect and reject dependency cycles.
- **Transitive blocking**: If A depends on B, and B depends on C, then A is transitively blocked until both B and C are `done`.

### Store

The physical location where Slate persists data. By default, this is a `slate/` directory at the project root, containing `prds/` and `tasks/` subdirectories. Each entity is a Markdown file with YAML frontmatter.

- **Git-tracked**: The store is committed to the project's repository. Every change is a diff.
- **Merge-safe**: One file per entity. Different branches modifying different entities never conflict.

### Ad-hoc Task

A task that is not bound to any PRD. Used for bugs, maintenance items, or work that doesn't fit a structured initiative.

## Design Decisions

### One file per entity

Each PRD and task gets its own file in the store. This ensures:

1. **Merge safety** — different branches modifying different entities produce no conflicts.
2. **Clean diffs** — git shows only the entity that changed.
3. **Parallel editing** — multiple agents or humans can work on different entities simultaneously.

### Markdown with YAML frontmatter

Entities use `.md` files with YAML frontmatter for structured data:

- **Structured fields** (id, title, status, priority, dependencies, prd, timestamps) live in frontmatter for machine parsing.
- **Freeform body** allows notes, reasoning, and context that isn't structured data.
- **Human readable** — both agents and humans can read and edit files directly.
- **Standard pattern** — well-established in the ecosystem (GitHub issues, static site generators, etc.).

### Optional PRD binding

Tasks can reference a PRD, but don't have to. This keeps the model flexible:

- Structured work flows through PRDs.
- Ad-hoc tasks (bugs, chores) exist without a PRD.
- The data model stays flat — no deep nesting.

### Scan-first, optimize later

Querying tasks reads all entity files from the store. This is O(n) but fast enough for the expected scale (20–100 tasks). An `index.json` is planned for future optimization but is not included in the initial design. Premature optimization is avoided in favor of simplicity.

### Single IStore interface

Slate uses a single `IStore` interface that handles both PRD and task operations. A single implementation (`LocalFileStore`) provides the concrete file-based storage. This avoids premature splitting into separate PRD and task store modules — both entity types share the same storage pattern (read/write markdown files with frontmatter). The interface gives us testability and a swap point if we ever need a different storage backend (e.g., `MemoryStore`, `SQLiteStore`).

### Planned future additions

- `slate/config.json` — project-level configuration (store path, defaults, etc.).
- `slate/index.json` — a fast-lookup index for large stores.
- TUI — a terminal UI for human interaction, built on top of the library.
- Extensions — framework-specific plugins (starting with Pi) for direct agentic integration.

## Architecture

```
slate/
  src/
    index.ts              # barrel — re-exports public API
    types.ts              # shared types (PRD, Task, Status, Priority)
    errors.ts             # error type discriminated unions

    IStore.ts             # single store interface (PRD + Task)
    LocalFileStore.ts     # file-based implementation (PRD + Task)

    cli/
      index.ts            # CLI entry point — wires LocalFileStore to IStore, registers commander commands
      commands/
        prd.ts            # "slate prd ..." handlers (commander action callbacks)
        task.ts           # "slate task ..." handlers (commander action callbacks)
      stdin.ts            # stdin reader (returns string | null) — still needed, commander doesn't handle pipes

    utils/
      result.ts           # Result<T,E>
      yaml.ts             # frontmatter parse/write
      id.ts               # ID generation (task-001, prd-001)
      date.ts             # ISO date formatting
```

### Module boundaries

- **`types.ts`** — shared domain types, no logic. Pure data shapes.
- **`errors.ts`** — discriminated error unions for each module.
- **`IStore.ts`** — single interface for all store operations. The contract.
- **`LocalFileStore.ts`** — concrete file-based implementation. Knows about `slate/prds/` and `slate/tasks/` directories.
- **`cli/`** — CLI wiring. Commander handles argument parsing, help generation, and subcommand dispatch. `stdin.ts` reads piped body content. `commands/` are action handlers that take the store interface and parsed options and return results.
- **`utils/`** — shared utilities: `result.ts` (Result type, already exists), `yaml.ts` (frontmatter parse/write), `id.ts` (sequential ID generation), `date.ts` (ISO date formatting).

### Dependency direction

```
cli/ → IStore → LocalFileStore → utils/
```

Modules only depend on interfaces of other modules, never on implementations. This is enforced by the code style guide and keeps modules independently testable.

## Entities Reference

### PRD Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (e.g., `prd-001`) |
| `title` | string | Yes | Human-readable name |
| `description` | string | No | Freeform body or summary |
| `status` | Status | Yes | Current status |
| `created` | date | Yes | Creation date (ISO 8601) |
| `updated` | date | Yes | Last modification date (ISO 8601) |

### Task Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (e.g., `task-001`) |
| `title` | string | Yes | Human-readable name |
| `description` | string | No | Freeform body or summary |
| `status` | Status | Yes | Current status |
| `priority` | Priority | Yes | Priority level |
| `dependencies` | string[] | Yes | Array of task IDs this task depends on |
| `prd` | string | No | Parent PRD ID (optional) |
| `created` | date | Yes | Creation date (ISO 8601) |
| `updated` | date | Yes | Last modification date (ISO 8601) |
