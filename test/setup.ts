import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "..", "..", ".test");

export function setup() {
	mkdirSync(TEST_DIR, { recursive: true });
}

export function teardown() {
	if (existsSync(TEST_DIR)) {
		rmSync(TEST_DIR, { recursive: true, force: true });
	}
}

export function getTestDir(): string {
	return TEST_DIR;
}
