import { Command } from "commander";
import { readStdin } from "src/cli/stdin";
import { PRDService } from "src/prd/PRDService";
import { LocalFileStore } from "src/store/LocalFileStore";
import { TaskService } from "src/task/TaskService";

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

/**
 * Initialize and run the Slate CLI.
 */
export function main(): void {
	const program = new Command();

	program
		.name("slate")
		.description("A minimal, agent-native issue tracker")
		.version("0.0.1");

	// Default store directory
	const defaultStoreDir = "./slate";

	// -- prd subcommand -------------------------------------------------------
	const prdCmd = new Command("prd");
	prdCmd.description("PRD management commands");

	// -- prd list ------------------------------------------------------------
	const prdListCmd = new Command("list");
	prdListCmd
		.description("List PRDs")
		.option("--dir <dir>", "Store directory", defaultStoreDir)
		.action(async (opts: { dir: string }) => {
			const store = new LocalFileStore(opts.dir);
			const service = new PRDService(store);
			const listResult = service.list();

			if (!listResult.ok) {
				process.stderr.write(
					`Error: Failed to list PRDs: ${listResult.error.kind}\n`,
				);
				process.exit(1);
			}

			const prds = listResult.value;

			if (prds.length === 0) {
				console.log("No PRDs found.");
				return;
			}

			console.log(
				prds
					.map((p) => `${p.id}\t${p.title}\t${p.status}\t${p.priority}`)
					.join("\n"),
			);
		});

	prdCmd.addCommand(prdListCmd);

	// -- prd show ------------------------------------------------------------
	const prdShowCmd = new Command("show");
	prdShowCmd
		.description("Show a PRD's details")
		.argument("<id>", "PRD ID")
		.option("--dir <dir>", "Store directory", defaultStoreDir)
		.action(async (id: string, opts: { dir: string }) => {
			const store = new LocalFileStore(opts.dir);
			const service = new PRDService(store);
			const result = service.read(id);

			if (!result.ok) {
				switch (result.error.kind) {
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

			const prd = result.value;
			console.log(`ID:       ${prd.id}`);
			console.log(`Title:    ${prd.title}`);
			console.log(`Status:   ${prd.status}`);
			console.log(`Priority: ${prd.priority}`);
			console.log(`Created:  ${prd.created}`);
			console.log(`Updated:  ${prd.updated}`);
		});

	prdCmd.addCommand(prdShowCmd);

	// -- prd create ------------------------------------------------------------
	const prdCreateCmd = new Command("create");
	prdCreateCmd
		.description("Create a new PRD")
		.requiredOption("--title <title>", "PRD title")
		.option(
			"--priority <priority>",
			"PRD priority (high, medium, low)",
			"medium",
		)
		.option(
			"--status <status>",
			"PRD status (todo, in-progress, done, blocked)",
			"todo",
		)
		.option("--dir <dir>", "Store directory", defaultStoreDir)
		.action(async (opts) => {
			const store = new LocalFileStore(opts.dir);
			const service = new PRDService(store);

			const result = service.create({
				title: opts.title,
				priority: opts.priority as "high" | "medium" | "low",
				status: opts.status as "todo" | "in-progress" | "done" | "blocked",
			});

			if (!result.ok) {
				switch (result.error.kind) {
					case "invalid-title":
						process.stderr.write(`Error: ${result.error.message}\n`);
						break;
					case "not-found":
						process.stderr.write(`Error: PRD ${result.error.id} not found\n`);
						break;
					case "invalid-status":
						process.stderr.write(
							`Error: Invalid status ${result.error.status}\n`,
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

			console.log(`Created PRD: ${result.value.id} — ${result.value.title}`);
		});

	prdCmd.addCommand(prdCreateCmd);
	program.addCommand(prdCmd);

	// -- task subcommand ------------------------------------------------------
	const taskCmd = new Command("task");
	taskCmd.description("Task management commands");

	// -- task list ------------------------------------------------------------
	const taskListCmd = new Command("list");
	taskListCmd
		.description("List tasks")
		.option(
			"--status <status>",
			"Filter by status (todo, in-progress, done, blocked)",
		)
		.option("--dir <dir>", "Store directory", defaultStoreDir)
		.action(async (opts: { status?: string; dir: string }) => {
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

	taskCmd.addCommand(taskListCmd);

	// -- task update ---------------------------------------------------------
	const taskUpdateCmd = new Command("update");
	taskUpdateCmd
		.description("Update a task")
		.argument("<id>", "Task ID")
		.option(
			"--status <status>",
			"New status (todo, in-progress, done, blocked)",
		)
		.option("--priority <priority>", "New priority (high, medium, low)")
		.option("--dir <dir>", "Store directory", defaultStoreDir)
		.action(
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
							process.stderr.write(
								`Error: Task ${result.error.id} not found\n`,
							);
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

	taskCmd.addCommand(taskUpdateCmd);

	// -- task create ------------------------------------------------------------
	const taskCreateCmd = new Command("create");
	taskCreateCmd
		.description("Create a new task")
		.requiredOption("--title <title>", "Task title")
		.option("--prd <prd>", "Parent PRD ID")
		.option(
			"--priority <priority>",
			"Task priority (high, medium, low)",
			"medium",
		)
		.option(
			"--status <status>",
			"Task status (todo, in-progress, done, blocked)",
			"todo",
		)
		.option("--dir <dir>", "Store directory", defaultStoreDir)
		.action(async (opts) => {
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
				const fs = await import("node:fs");
				const { join } = await import("node:path");
				const filePath = join(opts.dir, "tasks", `${result.value.id}.md`);
				const existing = fs.readFileSync(filePath, "utf-8");
				const fullContent = existing + stdinBody;
				fs.writeFileSync(filePath, fullContent, "utf-8");
			}

			console.log(`Created task: ${result.value.id} — ${result.value.title}`);
		});

	taskCmd.addCommand(taskCreateCmd);
	program.addCommand(taskCmd);

	program.parse();
}
