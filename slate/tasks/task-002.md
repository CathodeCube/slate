---
id: task-002
title: Extract store factory — remove LocalFileStore duplication from CLI commands
status: todo
priority: medium
dependencies: []
prd: prd-001
created: '2026-05-13T12:40:47.938Z'
updated: '2026-05-13T12:40:47.938Z'
---



## Problem

Every CLI command (`taskListCmd`, `taskUpdateCmd`, `taskCreateCmd`, `taskResolveCmd`, `prdListCmd`, `prdShowCmd`, `prdCreateCmd`, `planCmd`) follows the same pattern:

```typescript
const store = new LocalFileStore(opts.dir);
const service = new TaskService(store);
```

This is **shallow repetition** — the wiring logic is duplicated across 8 command factories. Each command is a thin adapter over `TaskService`/`PRDService` with no deep interface. The CLI has no seam for swapping the store (e.g., a `MemoryStore` for testing).

## Acceptance Criteria

- [ ] Extract a `makeStore(dir: string): IStore` factory function or `StoreFactory` interface that the CLI commands use.
- [ ] CLI commands depend on `IStore` through the factory, not on `LocalFileStore` directly.
- [ ] Tests can inject a mock store or `MemoryStore` without constructing the full wiring chain.
- [ ] All 8 command factories use the same wiring pattern through the factory.
- [ ] All existing integration tests pass.

## Files

- `src/cli/commands/task.ts` — task command factories
- `src/cli/commands/prd.ts` — PRD command factories
- `src/cli/commands/plan.ts` — plan command factory
- `src/cli/main.ts` — CLI wiring
- New module: `src/cli/store-factory.ts` (or similar)

