/**
 * Minimal ANSI color helpers for CLI output.
 *
 * No external dependencies. Colors are off by default for safety with
 * agent output capture (pipes, subprocesses, log files).
 *
 * Enable colors by setting SLATE_COLOR=1 in the environment.
 */

// ---------------------------------------------------------------------------
// Color constants
// ---------------------------------------------------------------------------

const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	cyan: "\x1b[36m",
	gray: "\x1b[90m",
	magenta: "\x1b[35m",
} as const;

/**
 * Whether to apply colors. Defaults to false.
 * Set SLATE_COLOR=1 to enable.
 */
let _shouldColor = false;

if (process.env.SLATE_COLOR === "1") {
	_shouldColor = true;
}

// ---------------------------------------------------------------------------
// Color functions
// ---------------------------------------------------------------------------

function wrap(color: string): (str: string) => string {
	return (str: string): string =>
		_shouldColor ? `${color}${str}${COLORS.reset}` : str;
}

export const reset = wrap(COLORS.reset);
export const bold = wrap(COLORS.bold);
export const red = wrap(COLORS.red);
export const green = wrap(COLORS.green);
export const yellow = wrap(COLORS.yellow);
export const cyan = wrap(COLORS.cyan);
export const gray = wrap(COLORS.gray);
export const magenta = wrap(COLORS.magenta);
