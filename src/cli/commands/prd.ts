import { Command } from "commander";
import { PRDService } from "src/prd/PRDService";
import { LocalFileStore } from "src/store/LocalFileStore";

// ---------------------------------------------------------------------------
// PRD command handlers
// ---------------------------------------------------------------------------

/**
 * Default store directory used by CLI commands.
 */
const _DEFAULT_STORE_DIR = "./slate";

// ---------------------------------------------------------------------------
// prd list
// ---------------------------------------------------------------------------

export function prdListCmd(defaultDir: string): Command {
	const cmd = new Command("list");
	cmd.description("List PRDs");
	cmd.option("--dir <dir>", "Store directory", defaultDir);
	cmd.action(async (opts: { dir: string }) => {
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
	return cmd;
}

// ---------------------------------------------------------------------------
// prd show
// ---------------------------------------------------------------------------

export function prdShowCmd(defaultDir: string): Command {
	const cmd = new Command("show");
	cmd.description("Show a PRD's details");
	cmd.argument("<id>", "PRD ID");
	cmd.option("--dir <dir>", "Store directory", defaultDir);
	cmd.action(async (id: string, opts: { dir: string }) => {
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
				default:
					process.stderr.write(
						`Error: Unknown PRD error: ${(result.error as { kind: string }).kind}\n`,
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
	return cmd;
}

// ---------------------------------------------------------------------------
// prd create
// ---------------------------------------------------------------------------

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
	cmd.option("--dir <dir>", "Store directory", defaultDir);
	cmd.action(async (opts) => {
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
				case "already-exists":
					process.stderr.write(
						`Error: PRD ${result.error.id} already exists\n`,
					);
					break;
				case "directory-invalid":
					process.stderr.write(
						`Error: Invalid directory ${result.error.path}: ${result.error.reason}\n`,
					);
					break;
				default:
					process.stderr.write(
						`Error: Unknown PRD error: ${(result.error as { kind: string }).kind}\n`,
					);
					break;
			}
			process.exit(1);
		}

		console.log(`Created PRD: ${result.value.id} — ${result.value.title}`);
	});
	return cmd;
}
