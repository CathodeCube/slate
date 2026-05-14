/**
 * Centralized error handler for CLI commands.
 *
 * Takes a `SlateError` and prints a human-readable message to stderr,
 * then calls `process.exit(1)`. This eliminates the duplicated
 * `switch` + `stderr.write` + `exit` pattern across all command handlers.
 */
import type { SlateError } from "src/Slate/ISlate";

/**
 * Print an error message to stderr and exit with code 1.
 *
 * @param error - The SlateError to display.
 */
export function handleError(error: SlateError): never {
	switch (error.kind) {
		// -- PRD errors -------------------------------------------------------
		case "prd-not-found":
			process.stderr.write(`Error: PRD ${error.id} not found\n`);
			break;
		case "prd-invalid-title":
			process.stderr.write(`Error: ${error.message}\n`);
			break;
		case "prd-invalid-status":
			process.stderr.write(`Error: Invalid status ${error.status}\n`);
			break;
		case "prd-corrupted-file":
			process.stderr.write(
				`Error: Corrupted file ${error.id}: ${error.message}\n`,
			);
			break;
		case "prd-already-exists":
			process.stderr.write(`Error: PRD ${error.id} already exists\n`);
			break;
		case "prd-directory-invalid":
			process.stderr.write(
				`Error: Invalid directory ${error.path}: ${error.reason}\n`,
			);
			break;

		// -- Task errors ------------------------------------------------------
		case "task-not-found":
			process.stderr.write(`Error: Task ${error.id} not found\n`);
			break;
		case "task-invalid-title":
			process.stderr.write(`Error: ${error.message}\n`);
			break;
		case "task-invalid-status":
			process.stderr.write(`Error: Invalid status ${error.status}\n`);
			break;
		case "task-invalid-priority":
			process.stderr.write(`Error: Invalid priority ${error.priority}\n`);
			break;
		case "task-corrupted-file":
			process.stderr.write(
				`Error: Corrupted file ${error.id}: ${error.message}\n`,
			);
			break;
		case "task-already-exists":
			process.stderr.write(`Error: Task ${error.id} already exists\n`);
			break;
		case "task-already-done":
			process.stderr.write(`Error: Task ${error.id} is already done\n`);
			break;
		case "task-directory-invalid":
			process.stderr.write(
				`Error: Invalid directory ${error.path}: ${error.reason}\n`,
			);
			break;

		// -- Store errors -----------------------------------------------------
		case "store-not-found":
			process.stderr.write(`Error: Store directory not found: ${error.path}\n`);
			break;
		case "store-is-file":
			process.stderr.write(
				`Error: Store path is a file, not a directory: ${error.path}\n`,
			);
			break;
		case "store-not-writable":
			process.stderr.write(
				`Error: Store directory not writable: ${error.path}\n`,
			);
			break;

		// -- Exhaustive switch guard ------------------------------------------
		default: {
			const _exhaustive: never = error;
			process.stderr.write(
				`Error: Unknown error type: ${(error as { kind: string }).kind}\n`,
			);
			break;
		}
	}

	process.exit(1);
}
