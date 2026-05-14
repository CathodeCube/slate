---
id: task-005
title: Deepen or simplify readEntity — clarify the entity reading seam
status: done
priority: low
dependencies: []
prd: prd-001
created: '2026-05-13T12:41:06.551Z'
updated: '2026-05-13T13:52:04.759Z'
---



## Problem

`readEntity` is documented as "generic" but is only used by `LocalFileStore` for PRD and task reads. The generic parameters (`T`, `S`) and the `mapRow` callback pattern make the interface **shallow** — the interface complexity (5 parameters including a Zod schema and a mapper function) nearly equals the implementation complexity.

The function was extracted for testability, but the real friction is in how it is called (inline mappers, inline schemas in `LocalFileStore`).

## Acceptance Criteria

- [ ] Define a clear module boundary for entity reading: either deepen `readEntity` into a `FileEntityReader` module with a deep interface (one method, one error type), or accept it as an internal seam of `LocalFileStore`.
- [ ] If deepening: extract a `FileEntityReader` interface with a `MemoryEntityReader` adapter for testing.
- [ ] If keeping as-is: simplify the interface — reduce parameters, eliminate inline mappers in callers.
- [ ] Entity reading logic (file path construction, YAML parsing, Zod validation, mapping) is concentrated in one place.
- [ ] No change to the `IStore` interface — this is internal deepening.
- [ ] All existing integration tests pass.

## Files

- `src/utils/entity.ts` — the generic reader (deepen or simplify)
- `src/store/LocalFileStore.ts` — caller (update to new pattern)
- `src/prd/types.ts`, `src/task/types.ts` — types (may need schema updates)

## Notes

- This is the lowest-priority candidate. The current `readEntity` works but has a shallow interface. The decision here depends on whether future entity types (e.g., `Comment`, `Tag`) are planned — if yes, deepen; if no, simplify to reduce interface complexity.
- If simplified, the goal is fewer parameters and no inline mappers in callers.

