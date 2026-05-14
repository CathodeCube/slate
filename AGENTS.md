# Important Rules

 - You have no network access. Do not run commands that require network access (e.g. `bun install`).
 - Think before acting. Always analyze the problem, repository, and context before making changes.
 - Do not modify files until you understand the surrounding code and conventions.
 - Only ask for confirmation when:
   - the task is ambiguous
   - the change is risky or large in scope
   - a design or product decision is required
    Otherwise, proceed autonomously.

 - When running a `bun` command, always use:
   - `bun run <script>` (e.g. `bun run test`, not `bun test`)

 - Before declaring work complete, you must run:
   - `bun run typecheck`
   - `bun run test`
   - `bun run format`
    Fix all failures before proceeding.

# Development Approach

 - Start by understanding the issue and defining clear acceptance criteria.
 - If acceptance criteria are missing, derive them as explicit, testable conditions.
 - Use these criteria as the definition of “done”.
 - Prefer minimal, targeted changes over large refactors.
 - Preserve existing behavior unless the issue explicitly requires changes.
 - Follow existing architecture, patterns, and conventions.

# Repository Awareness

 - Read relevant files before editing.
 - Reuse existing helpers and utilities where possible.
 - Avoid duplication.
 - Do not overwrite or revert unrelated changes.
 - Keep changes scoped strictly to the task.

# Diff Discipline

 - Keep diffs small and focused on the issue.
 - Do not include unrelated refactors or cleanups.
 - Avoid changing formatting outside the modified code unless required.
 - Do not rename, move, or restructure files unless necessary for the issue.
 - Make the smallest possible change that fully satisfies the acceptance criteria.
 - Ensure diffs are easy to review and clearly tied to the issue.

# Testing & Verification

 - Prefer integration tests over unit tests when appropriate.
 - Follow existing test patterns and conventions.
 - Ensure tests validate the acceptance criteria, not just implementation details.
 - If tests fail:
   - fix the implementation or tests
   - rerun until passing or clearly blocked

# Failure & Blocking

If you are unable to complete the task:
 - Clearly explain what is blocking progress
 - Include:
   - failing command(s)
   - relevant error output
   - missing information or ambiguity

Do NOT:
 - guess unclear requirements
 - mark work as complete
 - leave failing checks

# Completion Standard

Work is only complete when:
 - acceptance criteria are satisfied
 - implementation is correct and minimal
 - all checks pass (`typecheck`, `test`, `format`)
 - changes are consistent with the codebase

# Tools

You have access to the `bun run bulb` CLI:
 - Issues management:
   - `bun run bulb issues` (list commands and usage)
   - `next`, `start`, `done`, etc.

Use it to track and update issue state as part of your workflow.

# Code Style

 - Prefer full integration tests over unit tests
 - Follow existing naming and structure conventions
 - Keep code simple, readable, and consistent
 - Avoid unnecessary abstractions
 - Favor explicitness over cleverness

