/**
 * CLI command implementations for task management subcommands.
 *
 * Exports: `taskListCmd`, `taskUpdateCmd`, `taskCreateCmd`, `taskResolveCmd`,
 * `taskDeleteCmd`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Command } from "commander";
import { bold, cyan, gray, green, magenta } from "src/cli/colors";
import { handleError } from "src/cli/error";
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
		const slate = await createSlate(defaultDir);
		const listResult = await slate.taskList();

		if (!listResult.ok) {
			handleError(listResult.error);
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
			console.log(gray("No tasks found."));
			return;
		}

		console.log(
			tasks
				.map(
					(t) =>
						`${magenta(t.id)}\t${t.title}\t${cyan(t.status)}\t${gray(t.priority)}`,
				)
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
 * Updates a task's status, priority, and/or title by ID.
 * Requires at least one of `--status`, `--priority`, or `--title`.
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
	cmd.option("--title <title>", "New title");
	cmd.action(
		async (
			id: string,
			opts: { status?: string; priority?: string; title?: string },
		) => {
			const slate = await createSlate(defaultDir);
			const updates: {
				status?: "todo" | "in-progress" | "done" | "blocked";
				priority?: "high" | "medium" | "low";
				title?: string;
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
			if (opts.title) {
				updates.title = opts.title;
			}

			if (Object.keys(updates).length === 0) {
				process.stderr.write(
					"Error: Provide at least one of --status, --priority, or --title\n",
				);
				process.exit(1);
			}

			const result = await slate.taskUpdate(id, updates);

			if (!result.ok) {
				handleError(result.error);
			}

			console.log(`${green(`Updated task:`)} ${magenta(id)}`);
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
		const slate = await createSlate(defaultDir);

		const stdinBody = await readStdin();

		const result = await slate.taskCreate({
			title: opts.title,
			priority: opts.priority as "high" | "medium" | "low",
			status: opts.status as "todo" | "in-progress" | "done" | "blocked",
			prd: opts.prd,
		});

		if (!result.ok) {
			handleError(result.error);
		}

		// Write body to the task file if stdin was provided
		if (stdinBody) {
			const filePath = join(defaultDir, "tasks", `${result.value.id}.md`);
			const existing = readFileSync(filePath, "utf-8");
			const fullContent = `${existing}\n\n${stdinBody}`;
			writeFileSync(filePath, fullContent, "utf-8");
		}

		console.log(
			`${green(`Created task:`)} ${magenta(result.value.id)} — ${result.value.title}`,
		);
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
		const slate = await createSlate(defaultDir);

		const result = await slate.taskResolve(id);

		if (!result.ok) {
			handleError(result.error);
		}

		const unblocked = result.value.unblocked;
		console.log(`${green(`Resolved task:`)} ${magenta(id)}`);
		if (unblocked.length > 0) {
			console.log(
				`${bold(`Unblocked tasks:`)} ${unblocked.map((u) => magenta(u)).join(", ")}`,
			);
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
		const slate = await createSlate(defaultDir);

		const result = await slate.taskDelete(id);

		if (!result.ok) {
			handleError(result.error);
		}

		console.log(`${green(`Deleted task:`)} ${magenta(id)}`);
	});
	return cmd;
}
