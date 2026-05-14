import { Command } from "commander";
import { PRDService } from "src/prd/PRDService";
import { LocalFileStore } from "src/store/LocalFileStore";

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
				process.stderr.write(`Error: ${result.error.kind}\n`);
				process.exit(1);
			}

			console.log(`Created PRD: ${result.value.id} — ${result.value.title}`);
		});

	prdCmd.addCommand(prdCreateCmd);
	program.addCommand(prdCmd);

	program.parse();
}
