// ---------------------------------------------------------------------------
// Stdin reader
// ---------------------------------------------------------------------------

/**
 * Read all content from stdin as a string.
 * Returns null if stdin is not a TTY (i.e., nothing to read).
 */
export function readStdin(): Promise<string | null> {
	return new Promise((resolve) => {
		// If stdin is a TTY, there's no piped content
		if (process.stdin.isTTY) {
			resolve(null);
			return;
		}

		const chunks: Buffer[] = [];
		process.stdin.on("data", (chunk: Buffer) => {
			chunks.push(chunk);
		});
		process.stdin.on("end", () => {
			if (chunks.length === 0) {
				resolve(null);
			} else {
				resolve(Buffer.concat(chunks).toString("utf-8"));
			}
		});
		// Handle error case
		process.stdin.on("error", () => {
			resolve(null);
		});
	});
}
