---
id: task-003
title: >-
  Move Zod schemas out of LocalFileStore — single source of truth for entity
  serialization
status: done
priority: medium
dependencies: []
prd: prd-001
created: '2026-05-13T12:40:53.673Z'
updated: '2026-05-13T13:08:24.683Z'
---



## Problem

The Zod schemas `frontmatterSchema` and `taskFrontmatterSchema` live inside `LocalFileStore.ts` (a concrete implementation). They duplicate the field structure of `PRD` and `Task` types. The schemas are **private to the implementation** — they are not a seam.

This creates friction: if you add a field to `Task`, you must update three places (the `Task` interface, the Zod schema, and the `readEntity` mapper). The schema is not the single source of truth for the entity serialized shape.

## Acceptance Criteria

- [ ] Move Zod schemas to dedicated modules: `src/prd/schema.ts` and `src/task/schema.ts`.
- [ ] Each schema module exports both the type and its validation schema.
- [ ] `LocalFileStore` imports the schema instead of defining it inline.
- [ ] The mapper in `readEntity` calls the schema directly, eliminating the inline transform.
- [ ] Schemas are testable independently (unit tests for validation edge cases).
- [ ] All existing integration tests pass.
- [ ] No change to the `IStore` interface — this is an internal deepening.

## Files

- `src/store/LocalFileStore.ts` — remove inline Zod schemas
- New: `src/prd/schema.ts` — PRD Zod schema
- New: `src/task/schema.ts` — Task Zod schema
- `test/unit/store-validation.test.ts` — may need updates for new test patterns

## Notes

- The schemas and types should stay in sync. Consider generating schemas from types or using a tool like `zod-to-ts` to keep them aligned.
- This is a structural change with low risk — no behavior changes, just reorganization.

