# Orca — Code Style Guide

## General Principles

- **Readability over cleverness** — prefer explicit code over clever one-liners.
- **Consistency** — when in doubt, match the surrounding code.
- **Fail fast** — validate inputs early, return typed errors rather than throwing.

## Result Types

All fallible operations return `Result<T, E>` using the tagged union pattern.

- **Sync operations** return `Result<T, E>`.
- **Async operations** return `Promise<Result<T, E>>`.

The `E` type parameter should always be explicitly specified — never rely on the
`Error` default. Use narrow discriminated unions for error types.

```typescript
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
```

- Helper functions `ok()` and `err()` for constructing results.
- **Never throw** — callers must handle the `ok`/`error` branch.
- Errors are discriminated unions with a `kind` discriminator for exhaustiveness.

## Error Design

- Errors are **plain objects** with a `kind` discriminator.
- Include only fields relevant to the error kind.
- Keep error types narrow and specific — avoid a generic `Error` type.
- **When to add a new error variant vs. reuse an existing one**: Add a new kind
  only when callers need to handle it differently in a `switch`. If the handling
  is identical to another kind, merge them. If the distinction matters only for
  logging or diagnostics, keep the kind — it signals future-proofing.

```typescript
type ReadError =
  | { kind: "not-found"; path: string }
  | { kind: "permission-denied"; path: string }
  | { kind: "encoding"; path: string; cause: string };
```

## Naming Conventions

- **Interface (module contract)**: `I` prefix, PascalCase (e.g., `IFilesystem`). Signals this is a module boundary / contract.
- **Type (data shape)**: `type` keyword, PascalCase (e.g., `ReadResult`, `ReadError`). Used for unions, aliases, and data structures.
- **Variables/Functions**: camelCase. Prefer explicit, clear, longer names over acronyms for brevity. Clarity over brevity. (e.g., `withTempFile`, not `withTemp`; `tempFileHandle`, not `tfh`).
- **Constants**: UPPER_SNAKE_CASE.
- **Private fields**: `#privateField` (ES private), not `_privateField`.
- **Boolean variables and fields**: Use 'is' prefix as much as possible, (e.g., `isReady`, not `ready`)
- **Methods that return a primitive value**: Use uppercase acronym when the value maps to a well-known system concept or abbreviation (e.g., `getCWD()` for current working directory, `getTempDir()` for the OS temp directory). The `get` prefix makes it clear this is a method. Acronyms should be fully capitalized (e.g., `getCWD`, not `getCwd`; `employeeID`, not `employeeId`).

## File Organization

- One **interface** per file (e.g., `Filesystem.ts`).
- One **implementation** per file (e.g., `PodmanFilesystem.ts`).
- **Result types** live in `src/utils/result.ts` (lowercase kebab-case directory, lowercase file).
- **Utility modules** live in `src/utils/` (lowercase kebab-case directory names).
- **Error types** live in `types.ts` alongside their interface (e.g., `src/filesystem/types.ts`).
- Test files mirror source structure: `src/foo/bar.ts` → `test/foo/bar.test.ts`.

## Testing

- Use **vitest** for all tests.
- Test file naming: `*.test.ts`.
- **Integration-first** — test the interface contract, not implementation details.
- **Unit tests** live in `test/unit/` and are used only for pure helpers with no
  external dependencies (e.g., `result.test.ts`, `exec/run.test.ts`).
- Use descriptive test names: `it("returns NotFound when file does not exist")`.

### Test Directory Pattern

Tests that need an isolated filesystem must use the global test directory
(`.test/`) via `createTestDir()` from `test/utils.ts`. This creates a unique
subdirectory inside the global test directory — no per-test cleanup is needed
since the global teardown removes the parent directory, which removes all
subdirectories automatically.

```typescript
import { createTestDir } from "test/utils";

describe("some feature", () => {
  it("creates a file correctly", () => {
    const storeDir = createTestDir();
    // storeDir might be: "/path/.test/test-1747056000000-a3b9c1d2"
    const slate = new Slate({ dir: storeDir });
    // ... test logic ...
  });
});
```

## TypeScript

- **Strict mode** enabled (`tsconfig.json`).
- **`noEmit`** enabled — the project runs source directly via `bun`; there is no
  build step.
- **No `any`** — use `unknown` when the type is truly unknown.
- **Explicit return types** on public functions.
- **No `as` casts** — use type guards or narrowing instead.
- **Prefer `interface` for public APIs**, `type` for unions/intersections.

## Module Boundaries — Depend on Interfaces, Not Implementations

When one module needs to use another module, depend on the **interface** (the contract), not on a concrete implementation. This keeps modules loosely coupled and makes testing straightforward.

**Rule:** Pass dependencies through constructors (constructor injection), not by importing implementations directly inside the module.

```typescript
// ✅ correct — depends on the interface
import type { IFilesystem } from "src/filesystem";

class PodmanSandbox {
  constructor(private fs: IFilesystem) {}
}

// ❌ wrong — depends on the concrete implementation
import { LocalFilesystem } from "src/filesystem";

class PodmanSandbox {
  private fs = new LocalFilesystem();
}

// ❌ wrong — creates implementation inline
import { LocalFilesystem } from "src/filesystem";

class PodmanSandbox {
  private fs: IFilesystem = new LocalFilesystem();
}
```

**Why:**
- Tests can inject a mock implementation without needing to mock internal imports.
- Switching implementations later is a one-line change at the call site, not a refactor across the module.
- The interface is the contract; the implementation is an detail that should be decided by the caller, not the callee.

### Prefer Internal Modules Over Native Node Modules

When the project provides an internal module that wraps or abstracts a Node.js built-in, prefer importing from that internal module over importing directly from `node:*`. This keeps the codebase consistent and makes it easier to swap implementations or add testing hooks later.

```typescript
// ✅ correct — uses the project's abstraction
import { generateId } from "src/crypto";

// ❌ wrong — imports the native module directly
import { randomUUID } from "node:crypto";
```

**Why:**
- The internal module is the project's contract for that concern.
- If the abstraction later needs to change (e.g., mockable IDs, different RNG source), callers don't need to be updated.
- Makes the dependency graph explicit and auditable.

## Imports

- **Absolute imports** from project root (e.g., `import { Filesystem } from "src/Filesystem"`).
- Group imports: stdlib → third-party → internal.
- No default exports — use named exports only.
- **Always use `import()` over `require()`** — the project uses bundler-style module resolution via `tsconfig.json` paths. `require()` does not resolve these aliases in Node.js and will fail at runtime. Use `await import()` for dynamic imports and `import` for static ones.

```typescript
// ✅ correct — uses dynamic import
const mod = await import("src/Slate");

// ❌ wrong — require does not resolve tsconfig paths
const mod = require("src/Slate");
```

### Barrel imports (module encapsulation)

Directories with a public API must expose it through an `index.ts` barrel file. Consumers **must** import from the barrel, not from internal files:

```typescript
// ✅ correct — goes through the barrel
import { LocalFilesystem, ReadError } from "src/filesystem";

// ❌ wrong — bypasses the barrel
import { LocalFilesystem } from "src/filesystem/LocalFilesystem";
import { ReadError } from "src/filesystem/FilesystemErrors";
```

The barrel (`index.ts`) is the contract. It can change which files are re-exported without breaking consumers. Internal files (`types.ts`, `IFilesystem.ts`, `LocalFilesystem.ts`, etc.) are implementation details.

Every module directory (`filesystem`, `sandbox`, `exec`) that exposes a public API
surface must follow this rule.
