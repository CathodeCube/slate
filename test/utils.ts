import { mkdirSync } from "node:fs";
import { join } from "node:path";

import type { Result } from "src/utils/result";

// ---------------------------------------------------------------------------
// Test directory helpers
// ---------------------------------------------------------------------------

/**
 * Returns the global test directory path. Created once per test run by
 * setup.ts; removed after all tests complete.
 */
export function getTestDir(): string {
	return join(import.meta.dirname, "..", ".test");
}

/**
 * Create a unique subdirectory inside the global test directory.

Each test should call this to get its own isolated store path.
No cleanup is needed — the global teardown removes the parent
directory, which removes all subdirectories automatically.
 */
export function createTestDir(): string {
	const name = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const dir = join(getTestDir(), name);
	mkdirSync(dir, { recursive: true });
	return dir;
}

// ---------------------------------------------------------------------------
// Result assertion helpers
// ---------------------------------------------------------------------------

/**
 * Assert a Result is ok and return the unwrapped value.
 */
export function assertOk<T, E>(r: Result<T, E>): T {
	expect(r.ok).toBe(true);
	return (r as { ok: true; value: T }).value;
}

/**
 * Assert a Result is error, verify the kind, and return the unwrapped error.
 */
export function assertErr<E extends { kind: string }, K extends E["kind"]>(
	r: Result<unknown, E>,
	kind: K,
): Extract<E, { kind: K }> {
	expect(r.ok).toBe(false);
	const error = (r as { ok: false; error: E }).error;
	expect(error.kind).toBe(kind);
	return error as unknown as Extract<E, { kind: K }>;
}
