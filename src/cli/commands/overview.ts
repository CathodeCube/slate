/**
 * CLI command that prints an agent-friendly overview of all Slate commands.
 *
 * Used as a quick reference for AI agents to learn the available commands,
 * their options, and common usage patterns.
 */
import { Command } from "commander";

// ---------------------------------------------------------------------------
// overview command
// ---------------------------------------------------------------------------

/**
 * Create the `overview` CLI command.
 *
 * Prints an agent-friendly reference of all available Slate commands,
 * their options, and common usage patterns.
 *
 * @param defaultDir - The default store directory path to use.
 * @returns The configured Commander command.
 */
export function overviewCmd(defaultDir: string): Command {
	const cmd = new Command("overview");
	cmd.description("Show an agent-friendly overview of Slate commands");
	cmd.action(() => {
		const bt = "`";
		console.log(
			`
# Slate CLI — Agent Overview

## Available Commands

### slate init

Initialize the slate directory structure (creates ${bt}${defaultDir}/prds/${bt} and ${bt}${defaultDir}/tasks/${bt}).

    slate init

Creates:
  ${defaultDir}/prds/   — PRD files
  ${defaultDir}/tasks/  — Task files

### slate prd <subcommand>

Manage Product Requirements Documents.

    slate prd create --title "My Feature" [--priority high|medium|low] [--status todo|in-progress|done|blocked]
    slate prd list
    slate prd show <id>

### slate task <subcommand>

Manage tasks.

    slate task create --title "Do something" --priority high [--prd <prd-id>]
    slate task list [--status <status>]
    slate task update <id> [--status <status>] [--priority <priority>]
    slate task resolve <id>
    slate task delete <id>

### slate plan

Show the next actionable task (highest priority, all deps satisfied).

    slate plan

## Creating Tasks with EOF stdin

Tasks can have a body (description/notes) passed via stdin. Use EOF to pipe a
multi-line body:

    slate task create --title "Implement feature" --priority high --prd prd-001 <<EOF
Implement the login flow with email verification.
Include error handling for invalid credentials.
Add unit tests for the auth service.
EOF

## Common Patterns

1. **Initialize a project:**
       slate init

2. **Create a PRD:**
       slate prd create --title "Authentication" --priority high

3. **Create tasks under a PRD (with body via EOF):**
       slate task create --title "Design auth schema" --priority high --prd prd-001 <<EOF
Design the database schema for user authentication.
Include fields for email, password hash, and verification status.
EOF

4. **Find next work:**
       slate plan

5. **Mark work done:**
       slate task resolve <task-id>
`.trim(),
		);
	});
	return cmd;
}
