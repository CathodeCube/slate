# Contributing to Slate

Thank you for your interest in Slate! This guide covers how to contribute code, report bugs, and suggest features.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (latest stable)

### Local Setup

```bash
# Clone the repo
git clone https://github.com/cathodecube/slate.git
cd slate

# Install dependencies
bun install

# No build step needed — Slate runs from source via Bun
# Just verify the tests pass:
bun run test
bun run typecheck
```

Slate has **no build step**. It runs directly from source using Bun's native TypeScript support.

## Development Workflow

### Running Verification

```bash
# All tests
bun run test

# Type checking
bun run typecheck

# Formatting check
bun run format
```

All three must pass before a PR is considered ready.

### Writing Tests

- **Integration-first** — test through the public API (`Slate` facade), not internal modules.
- **Unit tests** are for pure helpers with no external dependencies only.
- Use `createTestDir()` from `test/utils.ts` for tests that need an isolated filesystem.
- Test file naming: `*.test.ts`, mirroring source structure.

### Code Style

This project follows a [code style guide](./CODE_STYLE.md). Key points:

- **No `any`** — use `unknown` when the type is truly unknown.
- **No `as` casts** — use type guards or narrowing instead.
- **No default exports** — named exports only.
- **No `require()`** — use `import()` for dynamic imports.
- **Fail fast** — validate inputs early, return typed errors rather than throwing.
- **No exceptions** — all fallible operations return `Result<T, E>`.
- **Depend on interfaces** — pass dependencies through constructors, not by importing implementations.

See [CODE_STYLE.md](./CODE_STYLE.md) for the full guide.

## Pull Request Process

1. **Create an issue** (or use an existing one) to discuss the change.
2. **Write tests** before or alongside your implementation.
3. **Keep PRs small** — one concern per PR. Prefer multiple focused PRs over one large one.
4. **Run all checks** before submitting:
   ```bash
   bun run typecheck && bun run test && bun run format
   ```
5. **Link the issue** in your PR description.
6. **Update documentation** if your change affects the CLI, library API, or data model.

## Adding a Feature

1. Check [ROADMAP.md](./ROADMAP.md) to see if the feature aligns with the project's direction.
2. If it's a new feature, consider opening an issue to propose it first.
3. Follow the existing architecture:
   - New types go in `src/<entity>/types.ts` (e.g. `src/task/types.ts`).
   - New services go in `src/<entity>/` alongside the existing ones (e.g. `src/task/TaskService.ts`).
   - New CLI commands go in `src/cli/commands/`.
   - New store operations go in `src/store/`.
4. Add tests in the corresponding `test/` directory.

## Reporting Bugs

Please include:

- Slate version (`bunx slate --version`)
- OS and Bun version
- Steps to reproduce
- Expected vs. actual behavior

## Suggesting Features

Open an issue with:

- A clear title
- The problem you're trying to solve
- Why it matters for Slate's mission (agent-native, minimal, git-tracked)
