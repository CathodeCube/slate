import { readdirSync } from "node:fs";

/**
 * Generate the next sequential ID by scanning existing files in `dir`
 * that match `prefix-<number><ext>`.
 *
 * @param dir  - The directory to scan.
 * @param prefix - The prefix before the number (e.g. "prd", "task").
 * @param ext  - The file extension to filter (e.g. ".md").
 * @returns The next sequential ID string (e.g. "prd-004").
 */
export function nextSequentialID(
	dir: string,
	prefix: string,
	ext: string,
): string {
	const files = readdirSync(dir).filter((f) => f.endsWith(ext));
	let maxNum = 0;
	for (const file of files) {
		const match = file.match(new RegExp(`^${prefix}-(\\d+)`));
		if (match) {
			const num = parseInt(match[1], 10);
			if (num > maxNum) {
				maxNum = num;
			}
		}
	}
	const nextNum = maxNum + 1;
	return `${prefix}-${String(nextNum).padStart(3, "0")}`;
}
