# Important Rules

 - Always read CONTEXT.md, CODE_STYLE.md and README.md.
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

# Code Style

 - Prefer full integration tests over unit tests
 - Follow existing naming and structure conventions
 - Keep code simple, readable, and consistent
 - Avoid unnecessary abstractions
 - Favor explicitness over cleverness

# Slate — Project Issue Tracking

**NOTE: This project also IS slate. The project uses itself for issue tracking.**

This project uses [Slate](https://github.com/) for issue tracking. Slate stores PRDs and tasks as git-tracked markdown files under `slate/`.

**When to use Slate:** Anytime a task, issue, feature, or bug needs to be tracked — before writing code, during implementation, or when planning next steps. Use it to track and update issue state as part of your workflow.

**How to learn Slate's commands:**

```bash
bunx slate overview
```

Run this command to get a full overview of available commands. The output includes examples for creating PRDs and tasks (including multi-line bodies via stdin), listing tasks, updating status, and finding the next actionable task.

**Key workflow:**

1. `bunx slate init` — Initialize the `slate/` directory if not already done.
2. `bunx slate prd create --title "..."` — Create a PRD for the feature.
3. `bunx slate task create --title "..." --prd <prd-id> --priority high <<EOF` — Create a task with a detailed body.
4. `bunx slate plan` — Find the next actionable task.
5. `bunx slate task update <id> --status in-progress` — When starting work.
6. `bunx slate task update <id> --status done` — When finished.

