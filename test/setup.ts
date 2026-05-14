import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

// Resolve relative to process CWD (project root) rather than import.meta.dirname,
// which resolves to / in vitest's global setup context.
const TEST_DIR = join(process.cwd(), ".test");

export function setup() {
	mkdirSync(TEST_DIR, { recursive: true });
}

export function teardown() {
	if (existsSync(TEST_DIR)) {
		rmSync(TEST_DIR, { recursive: true, force: true });
	}
}

export function getTestDir(): string {
	return join(process.cwd(), ".test");
}
