import type { Result } from "src/utils/result";

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
