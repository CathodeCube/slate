import { Command } from "commander";
import { registerPrdCommands } from "src/cli/commands/prd";
import { registerTaskCommands } from "src/cli/commands/task";
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
	registerPrdCommands(prdCmd, () => {
		const store = new LocalFileStore(defaultStoreDir);
		return new PRDService(store);
	});

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
	registerTaskCommands(taskCmd, () => {
		const store = new LocalFileStore(defaultStoreDir);
		return new TaskService(store);
	});

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
