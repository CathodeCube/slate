---
id: task-001
title: 'Deepen the Slate facade — narrow interface, hide service/store wiring'
status: done
priority: high
dependencies: []
prd: prd-001
created: '2026-05-13T12:40:42.707Z'
updated: '2026-05-13T12:40:42.707Z'
---

## Problem

The `Slate` class is documented as a "facade that wires `LocalFileStore` to `IStore` internally." But it doesn't just wire — it also exposes `taskQuery` (filtering logic) and `taskResolve` (calls `TaskService.resolve`). The class has a **shallow interface**: callers must know about `PRDService`/`TaskService` method signatures, error types (`PRDError`, `TaskError`), and the `SlateOptions` config shape.

The deletion test confirms: deleting `Slate` would just push complexity onto callers who would need to wire `LocalFileStore → PRDService/TaskService` themselves. Both the CLI commands and tests already do this wiring directly — `Slate` is never the pattern being followed.

## Acceptance Criteria

- [ ] Define a narrow `ISlate` interface (3–5 methods) that hides service/store wiring completely. Example methods: `createPRD`, `createTask`, `nextPlan`, `resolveTask`, `listTasks`.
- [ ] The current `SlateOptions` + service properties become internal implementation details — not part of the public API.
- [ ] Callers no longer need to know about `PRDError` vs `TaskError` — the facade exposes a unified `SlateError` or maps errors through the interface.
- [ ] Tests can write against `ISlate` with a `MemoryStore` adapter.
- [ ] All existing integration tests pass against the new interface.
- [ ] The CLI is updated to use the new interface (or the facade is removed if wiring is cleaner in the CLI itself).

## Files

- `src/Slate.ts` — the facade (rewrite or remove)
- `src/index.ts` — barrel (update exports)
- `test/integration/slate.test.ts` — update tests to use new interface
- `src/cli/commands/*.ts` — CLI wiring (may change if facade changes)

## Notes

- This is a design decision that needs exploration. The grilling phase should determine whether to go with Option A (deep interface with `ISlate`) or Option B (delete the facade entirely and let callers wire).
- If the `Slate` class is deleted, the CLI commands already have the pattern — they just need to stop instantiating `LocalFileStore` directly and use a factory instead.


