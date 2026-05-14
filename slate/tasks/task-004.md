---
id: task-004
title: Extract DependencyIndex — separate dependency graph from resolve logic
status: todo
priority: medium
dependencies: []
prd: prd-001
created: '2026-05-13T12:41:00.335Z'
updated: '2026-05-13T12:41:00.335Z'
---



## Problem

The `resolve` method in `TaskService` reads all tasks from the store (`listTasks()`), then iterates to find dependents. This has **no locality** for the "find dependents" concern — it is embedded in the resolve flow.

The `isTaskDone` helper also reads individual tasks from the store, creating an N+1 pattern. The cycle detection utility (`detectCycle`) is **unused** — `resolve` does not call it despite the `TaskError` having a `cycle-detected` kind.

## Acceptance Criteria

- [ ] Extract a `DependencyIndex` module that maintains an in-memory mapping of `taskId → dependentTaskIds`.
- [ ] `TaskService` receives the index via constructor injection.
- [ ] The index provides O(1) dependent lookup instead of iterating all tasks.
- [ ] The `resolve` interface is deep: callers pass a task ID, get unblocked tasks — dependency graph traversal is hidden.
- [ ] `detectCycle` is either used (integrate cycle detection back into `resolve`) or documented as dead code for removal.
- [ ] The `plan` command can reuse the same index for dependency checking.
- [ ] `DependencyIndex` is testable in isolation — inject a mock graph, verify traversal.
- [ ] All existing integration tests pass.

## Files

- `src/task/TaskService.ts` — rewrite `resolve` to use `DependencyIndex`
- New: `src/task/DependencyIndex.ts` — dependency graph module
- `src/cli/commands/plan.ts` — may reuse the index
- `src/utils/detect-cycle.ts` — integrate or document for removal

## Notes

- This is a performance + locality improvement. The current approach works but scales poorly as the store grows.
- The `DependencyIndex` interface should be: `build(tasks: Task[]): DependencyIndex`, `getDependents(id: string): string[]`, `isDone(id: string): boolean`.
- Consider whether `DependencyIndex` should also own the `detectCycle` logic, making it a unified dependency analysis module.

