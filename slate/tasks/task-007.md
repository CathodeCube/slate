---
id: task-007
title: Make PRDService and TaskService async
status: todo
priority: high
dependencies:
  - task-006
prd: prd-002
created: '2026-05-15T08:23:46.120Z'
updated: '2026-05-15T08:23:46.120Z'
---



Update `PRDService` and `TaskService` so all methods are `async` and return `Promise<Result<...>>`.

**PRDService changes:**
- `read(id): Promise<Result<PRD, PRDError>>` — `await this.store.readPRD(id)`, `await this.store.listTasks()`
- `list(): Promise<Result<PRD[], PRDError>>` — `await this.store.listPRDs()`, `await this.store.listTasks()`
- `create(params): Promise<Result<PRD, PRDError>>` — `await this.store.createPRD(prd)`

**TaskService changes:**
- `read(id): Promise<Result<Task, TaskError>>` — `await this.store.readTask(id)`
- `list(): Promise<Result<Task[], TaskError>>` — `await this.store.listTasks()`
- `create(params): Promise<Result<Task, TaskError | PRDError>>` — `await this.store.existsPRD()`, `await this.store.createTask(task)`
- `resolve(id): Promise<Result<ResolveResult, TaskError>>` — `await this.store.readTask()`, `await this.store.updateTask()`, `await this.store.listTasks()`, `await this.store.readTask()` for dependents
- `delete(id): Promise<Result<void, TaskError>>` — `await this.store.readTask()`, `await this.store.deleteTask()`
- `update(id, updates): Promise<Result<void, TaskError>>` — `await this.store.readTask()`, `await this.store.updateTask()`

**Key changes:**
- `PRDService.ts` — make all methods async, await store calls
- `TaskService.ts` — make all methods async, await store calls
- `Slate.ts` — will need to `await` service calls (handled in next task)
- `Slate` constructor — currently creates `TaskService` with a sync `listTasks()` call; this will break

**Tests to update:**
- `prd-create.test.ts` — update to handle async service calls
- `task-create.test.ts` — update to handle async service calls
- `dependency-index.test.ts` — no changes needed (pure function)
