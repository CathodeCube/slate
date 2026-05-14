/**
 * A tagged union representing either a success (`ok`) or a failure (`error`).
 *
 * All fallible operations in this project return `Result<T, E>` to avoid
 * exceptions and force explicit error handling.
 */
export type Result<T, E = Error> =
	| { ok: true; value: T }
	| { ok: false; error: E };

/**
 * Create a success `Result` with the given value.
 */
export function ok<T>(value: T): Result<T> {
	return { ok: true, value };
}

/**
 * Create a failure `Result` with the given error.
 */
export function err<E>(error: E): Result<never, E> {
	return { ok: false, error };
}
