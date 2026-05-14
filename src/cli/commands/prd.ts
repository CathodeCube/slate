/**
 * CLI command implementations for PRD management subcommands.
 *
 * Exports: `prdListCmd`, `prdShowCmd`, `prdCreateCmd`.
 */
import { Command } from "commander";
import { handleError } from "src/cli/error";
import { createSlate } from "src/Slate/factory";

// ---------------------------------------------------------------------------
// prd list
// ---------------------------------------------------------------------------

/**
 * Create the `prd list` CLI command.
 *
 * Lists all PRDs in the store, outputting one line per PRD with ID,
 * title, status, and priority separated by tabs.
 *
 * @param defaultDir - The default store directory path to use.
 * @returns The configured Commander command.
 */
export function prdListCmd(defaultDir: string): Command {
	const cmd = new Command("list");
	cmd.description("List PRDs");
	cmd.action(async () => {
		const slate = createSlate(defaultDir);
		const listResult = slate.prdList();

		if (!listResult.ok) {
			handleError(listResult.error);
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
	return cmd;
}

// ---------------------------------------------------------------------------
// prd show
// ---------------------------------------------------------------------------

/**
 * Create the `prd show` CLI command.
 *
 * Displays the details of a single PRD by ID, including title,
 * status, priority, and timestamps.
 *
 * @param defaultDir - The default store directory path to use.
 * @returns The configured Commander command.
 */
export function prdShowCmd(defaultDir: string): Command {
	const cmd = new Command("show");
	cmd.description("Show a PRD's details");
	cmd.argument("<id>", "PRD ID");
	cmd.action(async (id: string) => {
		const slate = createSlate(defaultDir);
		const result = slate.prdRead(id);

		if (!result.ok) {
			handleError(result.error);
		}

		const prd = result.value;
		console.log(`ID:       ${prd.id}`);
		console.log(`Title:    ${prd.title}`);
		console.log(`Status:   ${prd.status}`);
		console.log(`Priority: ${prd.priority}`);
		console.log(`Created:  ${prd.created}`);
		console.log(`Updated:  ${prd.updated}`);
	});
	return cmd;
}

// ---------------------------------------------------------------------------
// prd create
// ---------------------------------------------------------------------------

/**
 * Create the `prd create` CLI command.
 *
 * Creates a new PRD with the given title, priority, and status.
 * Defaults: priority = `"medium"`, status = `"todo"`.
 *
 * @param defaultDir - The default store directory path to use.
 * @returns The configured Commander command.
 */
export function prdCreateCmd(defaultDir: string): Command {
	const cmd = new Command("create");
	cmd.description("Create a new PRD");
	cmd.requiredOption("--title <title>", "PRD title");
	cmd.option(
		"--priority <priority>",
		"PRD priority (high, medium, low)",
		"medium",
	);
	cmd.option(
		"--status <status>",
		"PRD status (todo, in-progress, done, blocked)",
		"todo",
	);
	cmd.action(async (opts) => {
		const slate = createSlate(defaultDir);

		const result = slate.prdCreate({
			title: opts.title,
			priority: opts.priority as "high" | "medium" | "low",
			status: opts.status as "todo" | "in-progress" | "done" | "blocked",
		});

		if (!result.ok) {
			handleError(result.error);
		}

		console.log(`Created PRD: ${result.value.id} — ${result.value.title}`);
	});
	return cmd;
}
