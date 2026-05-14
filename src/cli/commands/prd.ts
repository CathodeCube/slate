import { Command } from "commander";
import type { PRDService } from "src/prd/PRDService";

// ---------------------------------------------------------------------------
// PRD CLI commands
// ---------------------------------------------------------------------------

/**
 * Register PRD subcommands on a commander Command instance.
 */
export function registerPrdCommands(
	cmd: Command,
	getService: () => PRDService,
): void {
	// -- prd list ------------------------------------------------------------
	const prdListCmd = new Command("list");
	prdListCmd
		.description("List PRDs")
		.option("--dir <dir>", "Store directory", "./slate")
		.action(async (_opts: { dir: string }) => {
			const service = getService();
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

	cmd.addCommand(prdListCmd);

	// -- prd show ------------------------------------------------------------
	const prdShowCmd = new Command("show");
	prdShowCmd
		.description("Show a PRD's details")
		.argument("<id>", "PRD ID")
		.option("--dir <dir>", "Store directory", "./slate")
		.action(async (id: string, _opts: { dir: string }) => {
			const service = getService();
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

	cmd.addCommand(prdShowCmd);
}
