import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import type { Result } from "src/utils/result";

// ---------------------------------------------------------------------------
// CLI helpers
// ---------------------------------------------------------------------------

/** Absolute path to the Slate CLI entry point. */
const CLI_PATH = resolve(import.meta.dirname, "..", "src", "cli", "main.ts");

// ---------------------------------------------------------------------------
// CLI helpers
// ---------------------------------------------------------------------------

/**
 * Run the Slate CLI as a subprocess and return stdout + stderr.
 */
export function runSlate(
	args: string[],
	opts?: { cwd?: string },
): {
	stdout: string;
	stderr: string;
	exitCode: number;
} {
	const cwd = opts?.cwd ?? process.cwd();
	const escapedArgs = args.map((a) => (a.includes(" ") ? `"${a}"` : a));
	const stderrFile = join(tmpdir(), "slate-test-stderr");
	const cmd = `bun ${CLI_PATH} ${escapedArgs.join(" ")} 2>${stderrFile}`;
	try {
		const stdout = execSync(cmd, {
			cwd,
			encoding: "utf-8",
			timeout: 10000,
		});
		if (existsSync(stderrFile)) {
			unlinkSync(stderrFile);
		}
		return { stdout, stderr: "", exitCode: 0 };
	} catch (e: unknown) {
		const err = e as { stdout?: Buffer; stderr?: Buffer; status?: number };
		const stderr = existsSync(stderrFile)
			? readFileSync(stderrFile, "utf-8").trim()
			: "";
		if (existsSync(stderrFile)) {
			unlinkSync(stderrFile);
		}
		return {
			stdout: (err.stdout?.toString() ?? "").trim(),
			stderr,
			exitCode: err.status ?? 1,
		};
	}
}

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
