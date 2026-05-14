import { Command } from "commander";
import type { TaskService } from "src/task/TaskService";

// ---------------------------------------------------------------------------
// Task CLI commands
// ---------------------------------------------------------------------------

/**
 * Register task subcommands on a commander Command instance.
 */
export function registerTaskCommands(
	cmd: Command,
	getService: () => TaskService,
): void {
	// -- task list -----------------------------------------------------------
	const taskListCmd = new Command("list");
	taskListCmd
		.description("List tasks")
		.option(
			"--status <status>",
			"Filter by status (todo, in-progress, done, blocked)",
		)
		.option("--dir <dir>", "Store directory", "./slate")
		.action(async (opts: { status?: string; dir: string }) => {
			const service = getService();
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

	cmd.addCommand(taskListCmd);

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
		.option("--dir <dir>", "Store directory", "./slate")
		.action(
			async (
				id: string,
				opts: { status?: string; priority?: string; dir: string },
			) => {
				const service = getService();

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

	cmd.addCommand(taskUpdateCmd);
}
