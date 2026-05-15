---
id: task-008
title: Make ISlate and Slate async + update CLI commands and tests
status: done
priority: high
dependencies:
  - task-007
prd: prd-002
created: '2026-05-15T08:23:54.319Z'
updated: '2026-05-15T09:02:15.093Z'
---



Make the public `ISlate` interface async, update the `Slate` facade class, the CLI commands, the factory, and the integration tests.

**ISlate changes (`ISlate.ts`):**
- `prdCreate(params): Promise<Result<PRD, SlateError>>`
- `prdRead(id): Promise<Result<PRD, SlateError>>`
- `prdList(): Promise<Result<PRD[], SlateError>>`
- `taskCreate(params): Promise<Result<Task, SlateError>>`
- `taskRead(id): Promise<Result<Task, SlateError>>`
- `taskList(filter?): Promise<Result<Task[], SlateError>>`
- `taskUpdate(id, updates): Promise<Result<void, SlateError>>`
- `taskResolve(id): Promise<Result<ResolveResult, SlateError>>`
- `taskDelete(id): Promise<Result<void, SlateError>>`

**Slate class changes (`Slate.ts`):**
- Constructor becomes `static async create(opts: SlateOptions): Promise<Slate>` — the current `listTasks()` call in the constructor is sync and will break. Make it async.
- All methods become `async` and `await` service calls
- Remove `SlateConstructionError` — construction failures are now returned as `Result` errors instead of thrown

**Factory changes (`factory.ts`):**
- `createSlate(dir): Promise<ISlate>` — becomes async, calls `Slate.create()`

**CLI command changes (`cli/commands/`):**
- All command handlers already use `async` callbacks — just add `await` before `createSlate()` and all service calls
- `prd.ts` — `prdListCmd`, `prdShowCmd`, `prdCreateCmd`
- `task.ts` — `taskListCmd`, `taskUpdateCmd`, `taskCreateCmd`, `taskResolveCmd`, `taskDeleteCmd`
- `plan.ts` — add `await` before `createSlate()` and `taskList()`
- `init.ts` — no changes needed (pure fs operations)

**Integration test changes (`test/integration/slate.test.ts`):**
- All test cases that call `slate.*` methods need `await`
- `new Slate({ dir })` becomes `await Slate.create({ dir })` or `await createSlate(dir)`
- `assertOk` helpers work the same — they just unwrap the `Result`

**Tests to update:**
- `test/integration/slate.test.ts` — all tests need async/await updates
- `test/integration/cli.test.ts` — update for async operations
- `test/integration/library-import.test.ts` — update for async operations

**Key considerations:**
- The `Slate` constructor currently throws `SlateConstructionError` on failure. This pattern should be removed — async constructors can't throw, so construction errors should be returned as `Result` via `static create()`.
- `createSlate()` factory needs to become async
- All CLI commands need `await` added
