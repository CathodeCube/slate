import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Command } from "commander";
import { readStdin } from "src/cli/stdin";
import { LocalFileStore } from "src/store/LocalFileStore";
import { TaskService } from "src/task/TaskService";

// ---------------------------------------------------------------------------
// Default store directory
// ---------------------------------------------------------------------------

const _DEFAULT_STORE_DIR = "./slate";

// ---------------------------------------------------------------------------
// task list
// ---------------------------------------------------------------------------

export function taskListCmd(defaultDir: string): Command {
	const cmd = new Command("list");
	cmd.description("List tasks");
	cmd.option(
		"--status <status>",
		"Filter by status (todo, in-progress, done, blocked)",
	);
	cmd.option("--dir <dir>", "Store directory", defaultDir);
	cmd.action(async (opts: { status?: string; dir: string }) => {
		const store = new LocalFileStore(opts.dir);
		const service = new TaskService(store);
		const listResult = service.list();

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

export function taskUpdateCmd(defaultDir: string): Command {
	const cmd = new Command("update");
	cmd.description("Update a task");
	cmd.argument("<id>", "Task ID");
	cmd.option(
		"--status <status>",
		"New status (todo, in-progress, done, blocked)",
	);
	cmd.option("--priority <priority>", "New priority (high, medium, low)");
	cmd.option("--dir <dir>", "Store directory", defaultDir);
	cmd.action(
		async (
			id: string,
			opts: { status?: string; priority?: string; dir: string },
		) => {
			const store = new LocalFileStore(opts.dir);
			const service = new TaskService(store);

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

			const result = service.update(id, updates);

			if (!result.ok) {
				switch (result.error.kind) {
					case "not-found":
						process.stderr.write(`Error: Task ${result.error.id} not found\n`);
						break;
					case "invalid-status":
						process.stderr.write(
							`Error: Invalid status ${result.error.status}\n`,
						);
						break;
					case "invalid-priority":
						process.stderr.write(
							`Error: Invalid priority ${result.error.priority}\n`,
						);
						break;
					case "corrupted-file":
						process.stderr.write(
							`Error: Corrupted file ${result.error.id}: ${result.error.message}\n`,
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
	cmd.option("--dir <dir>", "Store directory", defaultDir);
	cmd.action(async (opts) => {
		const store = new LocalFileStore(opts.dir);
		const service = new TaskService(store);

		const stdinBody = await readStdin();

		const result = service.create({
			title: opts.title,
			priority: opts.priority as "high" | "medium" | "low",
			status: opts.status as "todo" | "in-progress" | "done" | "blocked",
			prd: opts.prd,
		});

		if (!result.ok) {
			switch (result.error.kind) {
				case "invalid-title":
					process.stderr.write(`Error: ${result.error.message}\n`);
					break;
				case "invalid-status":
					process.stderr.write(
						`Error: Invalid status ${result.error.status}\n`,
					);
					break;
				case "invalid-priority":
					process.stderr.write(
						`Error: Invalid priority ${result.error.priority}\n`,
					);
					break;
				case "not-found":
					process.stderr.write(`Error: PRD ${result.error.id} not found\n`);
					break;
				case "corrupted-file":
					process.stderr.write(
						`Error: Corrupted file ${result.error.id}: ${result.error.message}\n`,
					);
					break;
			}
			process.exit(1);
		}

		// Write body to the task file if stdin was provided
		if (stdinBody) {
			const filePath = join(opts.dir, "tasks", `${result.value.id}.md`);
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

export function taskResolveCmd(defaultDir: string): Command {
	const cmd = new Command("resolve");
	cmd.description("Resolve a task (mark as done)");
	cmd.argument("<id>", "Task ID");
	cmd.option("--dir <dir>", "Store directory", defaultDir);
	cmd.action(async (id: string, opts: { dir: string }) => {
		const store = new LocalFileStore(opts.dir);
		const service = new TaskService(store);

		const result = service.resolve(id);

		if (!result.ok) {
			switch (result.error.kind) {
				case "not-found":
					process.stderr.write(`Error: Task ${result.error.id} not found\n`);
					break;
				case "cycle-detected":
					process.stderr.write(
						`Error: Dependency cycle detected: ${result.error.cycle.join(" -> ")}\n`,
					);
					break;
				case "corrupted-file":
					process.stderr.write(
						`Error: Corrupted file ${result.error.id}: ${result.error.message}\n`,
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

export function taskDeleteCmd(defaultDir: string): Command {
	const cmd = new Command("delete");
	cmd.description("Delete a task");
	cmd.argument("<id>", "Task ID");
	cmd.option("--dir <dir>", "Store directory", defaultDir);
	cmd.action(async (id: string, opts: { dir: string }) => {
		const store = new LocalFileStore(opts.dir);
		const service = new TaskService(store);

		const result = service.delete(id);

		if (!result.ok) {
			switch (result.error.kind) {
				case "not-found":
					process.stderr.write(`Error: Task ${result.error.id} not found\n`);
					break;
				case "corrupted-file":
					process.stderr.write(
						`Error: Corrupted file ${result.error.id}: ${result.error.message}\n`,
					);
					break;
			}
			process.exit(1);
		}

		console.log(`Deleted task: ${id}`);
	});
	return cmd;
}
