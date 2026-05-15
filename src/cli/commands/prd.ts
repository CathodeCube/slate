/**
 * CLI command implementations for PRD management subcommands.
 *
 * Exports: `prdListCmd`, `prdShowCmd`, `prdCreateCmd`.
 */
import { Command } from "commander";
import { bold, cyan, gray, green, magenta } from "src/cli/colors";
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
		const slate = await createSlate(defaultDir);
		const listResult = await slate.prdList();

		if (!listResult.ok) {
			handleError(listResult.error);
		}

		const prds = listResult.value;

		if (prds.length === 0) {
			console.log(gray("No PRDs found."));
			return;
		}

		console.log(
			prds
				.map(
					(p) =>
						`${magenta(p.id)}\t${p.title}\t${cyan(p.status)}\t${gray(p.priority)}`,
				)
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
		const slate = await createSlate(defaultDir);
		const result = await slate.prdRead(id);

		if (!result.ok) {
			handleError(result.error);
		}

		const prd = result.value;
		console.log(`${bold(`ID:`)}       ${magenta(prd.id)}`);
		console.log(`${bold(`Title:`)}    ${prd.title}`);
		console.log(`${bold(`Status:`)}   ${cyan(prd.status)}`);
		console.log(`${bold(`Priority:`)} ${gray(prd.priority)}`);
		console.log(`${bold(`Created:`)}  ${gray(prd.created)}`);
		console.log(`${bold(`Updated:`)}  ${gray(prd.updated)}`);
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
	cmd.action(async (opts) => {
		const slate = await createSlate(defaultDir);

		const result = await slate.prdCreate({
			title: opts.title,
			priority: opts.priority as "high" | "medium" | "low",
		});

		if (!result.ok) {
			handleError(result.error);
		}

		console.log(
			`${green(`Created PRD:`)} ${magenta(result.value.id)} — ${result.value.title}`,
		);
	});
	return cmd;
}
