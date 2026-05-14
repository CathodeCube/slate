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

### Service layer pattern

PRD and task operations are split into service classes (`PRDService`, `TaskService`) that encapsulate business logic (ID generation, default values, validation) and delegate persistence to `IStore`. This separates concerns: services handle "what to do," the store handles "how to persist."

### Facade class (`Slate`)

The `Slate` class is the public entry point for programmatic use. It wires `LocalFileStore` to `IStore` internally and exposes convenience methods (`prdCreate`, `taskCreate`, `taskQuery`, `taskResolve`, `taskUpdate`). Consumers use this class rather than wiring services and stores themselves.

### Single `IStore` interface

Slate uses a single `IStore` interface that handles both PRD and task operations. A single implementation (`LocalFileStore`) provides the concrete file-based storage. This avoids premature splitting into separate PRD and task store modules — both entity types share the same storage pattern (read/write markdown files with frontmatter). The interface gives us testability and a swap point if we ever need a different storage backend (e.g., `MemoryStore`, `SQLiteStore`).

### Result type for all fallible operations

All fallible operations return `Result<T, E>` using a tagged union pattern (`{ ok: true, value: T } | { ok: false, error: E }`). Errors are discriminated unions with a `kind` discriminator, enabling exhaustive `switch` handling. Errors are plain objects — never thrown.

### Entity abstraction via `readEntity`

A generic `readEntity` utility (`src/utils/entity.ts`) handles reading entity files, parsing YAML frontmatter via `gray-matter`, validating against a Zod schema, and mapping to the entity type. This eliminates duplication between PRD and task read operations.

### Sequential ID generation

IDs are generated sequentially by scanning existing files in the target directory (`src/utils/id.ts`). Format: `<prefix>-<3-digit-zero-padded-number>` (e.g., `prd-001`, `task-004`). Each entity type (PRD, task) has its own independent counter.

### Planned future additions

- `slate/config.json` — project-level configuration (store path, defaults, etc.).
- `slate/index.json` — a fast-lookup index for large stores.
- TUI — a terminal UI for human interaction, built on top of the library.
- Extensions — framework-specific plugins (starting with Pi) for direct agentic integration.

## Architecture

```
src/
  index.ts              # barrel — re-exports public API (Slate class)
  Slate.ts              # facade class — wires LocalFileStore to IStore, exposes convenience methods

  store/
    index.ts            # barrel — re-exports IStore and LocalFileStore
    IStore.ts           # single store interface (PRD + Task)
    LocalFileStore.ts   # file-based implementation (PRD + Task)

  prd/
    index.ts            # barrel — re-exports PRDService and PRD types
    PRDService.ts       # service layer for PRD operations
    types.ts            # PRD entity type and PRDError discriminated union

  task/
    index.ts            # barrel — re-exports TaskService and Task types
    TaskService.ts      # service layer for task operations
    types.ts            # Task entity type, TaskError discriminated union, TaskQueryFilter

  cli/
    main.ts             # CLI entry point — wires commands via Commander
    stdin.ts            # stdin reader (returns string | null)
    commands/
      init.ts           # "slate init" — creates slate/prds and slate/tasks directories
      overview.ts       # "slate overview" — agent-friendly command reference
      plan.ts           # "slate plan" — shows next actionable task
      prd.ts            # "slate prd" subcommands (list, show, create)
      task.ts           # "slate task" subcommands (list, update, create, resolve, delete)

  utils/
    result.ts           # Result<T,E> tagged union + ok()/err() helpers
    id.ts               # sequential ID generation (task-001, prd-001)
    entity.ts           # generic entity file reader with Zod frontmatter validation
    detect-cycle.ts     # DFS-based dependency cycle detection (internal utility)

slate/
  prds/                 # PRD files (one per PRD, .md with YAML frontmatter)
  tasks/                # Task files (one per task, .md with YAML frontmatter)
```

### Module boundaries

- **`types.ts`** — shared domain types, no logic. Pure data shapes. PRD types live in `src/prd/types.ts`, Task types in `src/task/types.ts`, with `Priority` imported from `src/prd/types`.
- **`PRDService` / `TaskService`** — service layer classes. They depend on `IStore` (interface), not on `LocalFileStore` (implementation). Each handles business logic: ID generation, default values, validation, and persistence delegation.
- **`IStore.ts`** — single interface for all store operations. The contract.
- **`LocalFileStore.ts`** — concrete file-based implementation. Knows about `slate/prds/` and `slate/tasks/` directories. Uses `gray-matter` for YAML frontmatter and Zod for schema validation.
- **`Slate`** — facade class. The public entry point for programmatic use. Wires `LocalFileStore` to `IStore` internally and exposes convenience methods.
- **`cli/`** — CLI wiring. Commander handles argument parsing, help generation, and subcommand dispatch. `stdin.ts` reads piped body content. `commands/` are action handlers that instantiate `LocalFileStore`, wire it to services, and execute operations.
- **`utils/`** — shared utilities: `result.ts` (Result type), `id.ts` (sequential ID generation), `entity.ts` (generic entity file reader with Zod validation), `detect-cycle.ts` (DFS-based cycle detection, internal).
- **Barrel files** (`index.ts`) — every module directory (`store/`, `prd/`, `task/`) exposes its public API through a barrel. Consumers must import from the barrel, not from internal files.

### Dependency direction

```
cli/ → services (PRDService, TaskService) → IStore → LocalFileStore → utils/
Slate (facade) → LocalFileStore → IStore
```

Modules depend on interfaces of other modules via constructor injection (not by importing implementations). The CLI and `Slate` class are the only places where concrete implementations are instantiated.

## Entities Reference

### PRD Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (e.g., `prd-001`) |
| `title` | string | Yes | Human-readable name |
| `status` | PRDStatus | Yes | Current status (`todo`, `in-progress`, `done`, `blocked`) |
| `priority` | Priority | Yes | Priority level (`high`, `medium`, `low`) |
| `created` | date | Yes | Creation date (ISO 8601) |
| `updated` | date | Yes | Last modification date (ISO 8601) |

### Task Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (e.g., `task-001`) |
| `title` | string | Yes | Human-readable name |
| `status` | TaskStatus | Yes | Current status (`todo`, `in-progress`, `done`, `blocked`) |
| `priority` | Priority | Yes | Priority level (`high`, `medium`, `low`) |
| `dependencies` | string[] | Yes | Array of task IDs this task depends on |
| `prd` | string | No | Parent PRD ID (optional) |
| `created` | date | Yes | Creation date (ISO 8601) |
| `updated` | date | Yes | Last modification date (ISO 8601) |

### Error Types

#### PRDError

| Kind | Fields | Meaning |
|------|--------|---------|
| `not-found` | `id: string` | PRD does not exist |
| `invalid-title` | `message: string` | Title validation failed |
| `invalid-status` | `status: string` | Status is not a valid value |
| `corrupted-file` | `id: string`, `message: string` | Frontmatter failed Zod validation |
| `already-exists` | `id: string` | PRD file already exists on disk |
| `directory-invalid` | `path: string`, `reason: string` | Store directory is invalid |

#### TaskError

| Kind | Fields | Meaning |
|------|--------|---------|
| `not-found` | `id: string` | Task does not exist |
| `invalid-title` | `message: string` | Title validation failed |
| `invalid-status` | `status: string` | Status is not a valid value |
| `invalid-priority` | `priority: string` | Priority is not a valid value |
| `corrupted-file` | `id: string`, `message: string` | Frontmatter failed Zod validation |
| `already-exists` | `id: string` | Task file already exists on disk |
| `already-done` | `id: string` | Task is already resolved (status is `done`) |
| `directory-invalid` | `path: string`, `reason: string` | Store directory is invalid |

#### StoreInitError

| Kind | Fields | Meaning |
|------|--------|---------|
| `not-found` | `path: string` | Store directory does not exist |
| `is-file` | `path: string` | Path exists but is a file, not a directory |
| `not-writable` | `path: string` | Directory exists but is not writable |
