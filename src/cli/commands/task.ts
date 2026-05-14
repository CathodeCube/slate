/**
 * CLI command implementations for task management subcommands.
 *
 * Exports: `taskListCmd`, `taskUpdateCmd`, `taskCreateCmd`, `taskResolveCmd`,
 * `taskDeleteCmd`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Command } from "commander";
import { readStdin } from "src/cli/stdin";
import { createSlate } from "src/Slate/factory";

// ---------------------------------------------------------------------------
// task list
// ---------------------------------------------------------------------------

/**
 * Create the `task list` CLI command.
 *
 * Lists all tasks in the store, optionally filtered by status.
 * Output is one line per task with ID, title, status, and priority separated by tabs.
 *
 * @param defaultDir - The default store directory path to use.
 * @returns The configured Commander command.
 */
export function taskListCmd(defaultDir: string): Command {
	const cmd = new Command("list");
	cmd.description("List tasks");
	cmd.option(
		"--status <status>",
		"Filter by status (todo, in-progress, done, blocked)",
	);
	cmd.action(async (opts: { status?: string }) => {
		const slate = createSlate(defaultDir);
		const listResult = slate.taskList();

		if (!listResult.ok) {
			process.stderr.write(
				`Error: Failed to list tasks: ${listResult.error.kind}\n`,
			);
			process.exit(1);
		}

		let tasks = listResult.value;

		if (opts.status) {
			const validStatuses = ["todo", "in-progress", "done", "blocked"];
			if (!validStatuses.includes(opts.status)) {
				process.stderr.write(
					`Error: Invalid status '${opts.status}'. Must be one of: ${validStatuses.join(", ")}\n`,
				);
				process.exit(1);
			}
			tasks = tasks.filter((t) => t.status === opts.status);
		}

		if (tasks.length === 0) {
			console.log("No tasks found.");
			return;
		}

		console.log(
			tasks
				.map((t) => `${t.id}\t${t.title}\t${t.status}\t${t.priority}`)
				.join("\n"),
		);
	});
	return cmd;
}

// ---------------------------------------------------------------------------
// task update
// ---------------------------------------------------------------------------

/**
 * Create the `task update` CLI command.
 *
 * Updates a task's status and/or priority by ID.
 * Requires at least one of `--status` or `--priority`.
 *
 * @param defaultDir - The default store directory path to use.
 * @returns The configured Commander command.
 */
export function taskUpdateCmd(defaultDir: string): Command {
	const cmd = new Command("update");
	cmd.description("Update a task");
	cmd.argument("<id>", "Task ID");
	cmd.option(
		"--status <status>",
		"New status (todo, in-progress, done, blocked)",
	);
	cmd.option("--priority <priority>", "New priority (high, medium, low)");
	cmd.action(
		async (id: string, opts: { status?: string; priority?: string }) => {
			const slate = createSlate(defaultDir);
			const updates: {
				status?: "todo" | "in-progress" | "done" | "blocked";
				priority?: "high" | "medium" | "low";
			} = {};

			if (opts.status) {
				updates.status = opts.status as
					| "todo"
					| "in-progress"
					| "done"
					| "blocked";
			}
			if (opts.priority) {
				updates.priority = opts.priority as "high" | "medium" | "low";
			}

			if (Object.keys(updates).length === 0) {
				process.stderr.write(
					"Error: Provide at least one of --status or --priority\n",
				);
				process.exit(1);
			}

			const result = slate.taskUpdate(id, updates);

			if (!result.ok) {
				switch (result.error.kind) {
					case "task-not-found":
						process.stderr.write(`Error: Task ${result.error.id} not found\n`);
						break;
					case "task-invalid-status":
						process.stderr.write(
							`Error: Invalid status ${result.error.status}\n`,
						);
						break;
					case "task-invalid-priority":
						process.stderr.write(
							`Error: Invalid priority ${result.error.priority}\n`,
						);
						break;
					case "task-corrupted-file":
						process.stderr.write(
							`Error: Corrupted file ${result.error.id}: ${result.error.message}\n`,
						);
						break;
					case "task-already-exists":
						process.stderr.write(
							`Error: Task ${result.error.id} already exists\n`,
						);
						break;
					case "task-already-done":
						process.stderr.write(
							`Error: Task ${result.error.id} is already done\n`,
						);
						break;
					case "task-directory-invalid":
						process.stderr.write(
							`Error: Invalid directory ${result.error.path}: ${result.error.reason}\n`,
						);
						break;
					default:
						process.stderr.write(
							`Error: Unknown task error: ${(result.error as { kind: string }).kind}\n`,
						);
						break;
				}
				process.exit(1);
			}

			console.log(`Updated task: ${id}`);
		},
	);
	return cmd;
}

// ---------------------------------------------------------------------------
// task create
// ---------------------------------------------------------------------------

/**
 * Create the `task create` CLI command.
 *
 * Creates a new task with the given title, priority, status, and optional
 * parent PRD. Body content can be piped via stdin.
 * Defaults: priority = `"medium"`, status = `"todo"`.
 *
 * @param defaultDir - The default store directory path to use.
 * @returns The configured Commander command.
 */
export function taskCreateCmd(defaultDir: string): Command {
	const cmd = new Command("create");
	cmd.description("Create a new task");
	cmd.requiredOption("--title <title>", "Task title");
	cmd.option("--prd <prd>", "Parent PRD ID");
	cmd.option(
		"--priority <priority>",
		"Task priority (high, medium, low)",
		"medium",
	);
	cmd.option(
		"--status <status>",
		"Task status (todo, in-progress, done, blocked)",
		"todo",
	);
	cmd.action(async (opts) => {
		const slate = createSlate(defaultDir);

		const stdinBody = await readStdin();

		const result = slate.taskCreate({
			title: opts.title,
			priority: opts.priority as "high" | "medium" | "low",
			status: opts.status as "todo" | "in-progress" | "done" | "blocked",
			prd: opts.prd,
		});

		if (!result.ok) {
			switch (result.error.kind) {
				case "task-invalid-title":
					process.stderr.write(`Error: ${result.error.message}\n`);
					break;
				case "task-invalid-status":
					process.stderr.write(
						`Error: Invalid status ${result.error.status}\n`,
					);
					break;
				case "task-invalid-priority":
					process.stderr.write(
						`Error: Invalid priority ${result.error.priority}\n`,
					);
					break;
				case "task-not-found":
					process.stderr.write(`Error: PRD ${result.error.id} not found\n`);
					break;
				case "task-corrupted-file":
					process.stderr.write(
						`Error: Corrupted file ${result.error.id}: ${result.error.message}\n`,
					);
					break;
				case "task-already-exists":
					process.stderr.write(
						`Error: Task ${result.error.id} already exists\n`,
					);
					break;
				case "task-directory-invalid":
					process.stderr.write(
						`Error: Invalid directory ${result.error.path}: ${result.error.reason}\n`,
					);
					break;
				default:
					process.stderr.write(
						`Error: Unknown task error: ${(result.error as { kind: string }).kind}\n`,
					);
					break;
			}
			process.exit(1);
		}

		// Write body to the task file if stdin was provided
		if (stdinBody) {
			const filePath = join(defaultDir, "tasks", `${result.value.id}.md`);
			const existing = readFileSync(filePath, "utf-8");
			const fullContent = `${existing}\n\n${stdinBody}`;
			writeFileSync(filePath, fullContent, "utf-8");
		}

		console.log(`Created task: ${result.value.id} — ${result.value.title}`);
	});
	return cmd;
}

// ---------------------------------------------------------------------------
// task resolve
// ---------------------------------------------------------------------------

/**
 * Create the `task resolve` CLI command.
 *
 * Marks a task as done and reports any dependent tasks that become
 * unblocked as a result.
 *
 * @param defaultDir - The default store directory path to use.
 * @returns The configured Commander command.
 */
export function taskResolveCmd(defaultDir: string): Command {
	const cmd = new Command("resolve");
	cmd.description("Resolve a task (mark as done)");
	cmd.argument("<id>", "Task ID");
	cmd.action(async (id: string) => {
		const slate = createSlate(defaultDir);

		const result = slate.taskResolve(id);

		if (!result.ok) {
			switch (result.error.kind) {
				case "task-not-found":
					process.stderr.write(`Error: Task ${result.error.id} not found\n`);
					break;
				case "task-already-done":
					process.stderr.write(
						`Error: Task ${result.error.id} is already done\n`,
					);
					break;
				case "task-corrupted-file":
					process.stderr.write(
						`Error: Corrupted file ${result.error.id}: ${result.error.message}\n`,
					);
					break;
				case "task-already-exists":
					process.stderr.write(
						`Error: Task ${result.error.id} already exists\n`,
					);
					break;
				case "task-directory-invalid":
					process.stderr.write(
						`Error: Invalid directory ${result.error.path}: ${result.error.reason}\n`,
					);
					break;
				default:
					process.stderr.write(
						`Error: Unknown task error: ${(result.error as { kind: string }).kind}\n`,
					);
					break;
			}
			process.exit(1);
		}

		const unblocked = result.value.unblocked;
		console.log(`Resolved task: ${id}`);
		if (unblocked.length > 0) {
			console.log(`Unblocked tasks: ${unblocked.join(", ")}`);
		}
	});
	return cmd;
}

// ---------------------------------------------------------------------------
// task delete
// ---------------------------------------------------------------------------

/**
 * Create the `task delete` CLI command.
 *
 * Deletes a task by ID from the store.
 *
 * @param defaultDir - The default store directory path to use.
 * @returns The configured Commander command.
 */
export function taskDeleteCmd(defaultDir: string): Command {
	const cmd = new Command("delete");
	cmd.description("Delete a task");
	cmd.argument("<id>", "Task ID");
	cmd.action(async (id: string) => {
		const slate = createSlate(defaultDir);

		const result = slate.taskDelete(id);

		if (!result.ok) {
			switch (result.error.kind) {
				case "task-not-found":
					process.stderr.write(`Error: Task ${result.error.id} not found\n`);
					break;
				case "task-corrupted-file":
					process.stderr.write(
						`Error: Corrupted file ${result.error.id}: ${result.error.message}\n`,
					);
					break;
				case "task-already-exists":
					process.stderr.write(
						`Error: Task ${result.error.id} already exists\n`,
					);
					break;
				case "task-directory-invalid":
					process.stderr.write(
						`Error: Invalid directory ${result.error.path}: ${result.error.reason}\n`,
					);
					break;
				default:
					process.stderr.write(
						`Error: Unknown task error: ${(result.error as { kind: string }).kind}\n`,
					);
					break;
			}
			process.exit(1);
		}

		console.log(`Deleted task: ${id}`);
	});
	return cmd;
}
