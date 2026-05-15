---
id: task-006
title: Make IStore async — change all method signatures to return Promise<Result<...>>
status: todo
priority: high
dependencies: []
prd: prd-002
created: '2026-05-15T08:23:39.697Z'
updated: '2026-05-15T08:23:39.697Z'
---



Change the `IStore` interface so every method returns `Promise<Result<...>>` instead of `Result<...>`. This includes:

**PRD operations:**
- `existsPRD(id): Promise<boolean>` (or keep as sync — no I/O)
- `createPRD(prd): Promise<Result<void, PRDEError>>`
- `readPRD(id): Promise<Result<PRD, PRDError>>`
- `listPRDs(): Promise<Result<PRD[], PRDError>>`
- `nextPRDID(): string` (keep sync — no I/O)

**Task operations:**
- `createTask(task): Promise<Result<void, TaskError>>`
- `updateTask(task): Promise<Result<void, TaskError>>`
- `readTask(id): Promise<Result<Task, TaskError>>`
- `listTasks(): Promise<Result<Task[], TaskError>>`
- `nextTaskID(): string` (keep sync — no I/O)
- `deleteTask(id): Promise<Result<void, TaskError>>`

**Update `LocalFileStore`:** Wrap all implementations to return promises. Since the underlying `fs` calls are sync, this is straightforward — just wrap in `Promise.resolve()` or make methods `async` and `await` the fs calls.

**Key changes:**
- `IStore.ts` — update all method signatures
- `LocalFileStore.ts` — make all methods async
- `PRDService.ts` — update to `await` store calls (part of next task, but note the interface change here)
- `Slate.ts` constructor — currently calls `this.#store.listTasks()` synchronously; this will break and needs to be addressed in the next task
- `SlateConstructionError` — may need a new error kind for construction-time async failures

**Tests to update:**
- Integration tests that instantiate `LocalFileStore` directly will need to `await` calls
- `store-validation.test.ts` — update to handle async store calls
