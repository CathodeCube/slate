/**
 * Minimal ANSI color helpers for CLI output.
 *
 * No external dependencies. Colors are enabled by default (standard
 * CLI convention) and disabled when output is piped.
 *
 * To force colors regardless of output destination: SLATE_COLOR=1
 * To force no colors regardless of output destination: SLATE_COLOR=0
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
 * Detect whether stdout is a TTY.
 * Returns true when running in an interactive terminal.
 * Returns false when output is piped or captured.
 */
function isTTY(): boolean {
	// Bun: check isTTY on stdout
	if (typeof process.stdout.isTTY !== "undefined") {
		return process.stdout.isTTY === true;
	}
	// Node.js: use tty.isatty
	try {
		const { isatty } = require("node:tty");
		return isatty(1);
	} catch {
		return false;
	}
}

let isColorEnabled: boolean;
if (process.env.SLATE_COLOR === "0") {
	isColorEnabled = false;
} else if (process.env.SLATE_COLOR === "1") {
	isColorEnabled = true;
} else {
	isColorEnabled = isTTY();
}

// ---------------------------------------------------------------------------
// Color functions
// ---------------------------------------------------------------------------

function wrap(color: string): (str: string) => string {
	return (str: string): string =>
		isColorEnabled ? `${color}${str}${COLORS.reset}` : str;
}

export const reset = wrap(COLORS.reset);
export const bold = wrap(COLORS.bold);
export const red = wrap(COLORS.red);
export const green = wrap(COLORS.green);
export const yellow = wrap(COLORS.yellow);
export const cyan = wrap(COLORS.cyan);
export const gray = wrap(COLORS.gray);
export const magenta = wrap(COLORS.magenta);
