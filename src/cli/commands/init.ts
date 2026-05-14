import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { Command } from "commander";

// ---------------------------------------------------------------------------
// init command
// ---------------------------------------------------------------------------

export function initCmd(defaultDir: string): Command {
	const cmd = new Command("init");
	cmd.description(
		"Initialize the slate directory structure in the target project",
	);
	cmd.action(async () => {
		const dirs = ["prds", "tasks"];

		for (const sub of dirs) {
			const path = join(defaultDir, sub);
			if (!existsSync(path)) {
				mkdirSync(path, { recursive: true });
				console.log(`Created: ${path}`);
			} else {
				console.log(`Exists:  ${path}`);
			}
		}

		console.log(`\nSlate initialized at ${defaultDir}`);
	});
	return cmd;
}
