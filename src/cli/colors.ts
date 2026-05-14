/**
 * Minimal ANSI color helpers for CLI output.
 *
 * No external dependencies — uses terminal escape codes directly.
 * Colors are only applied when stdout/stderr is a TTY.
 */

// ---------------------------------------------------------------------------
// Color constants
// ---------------------------------------------------------------------------

/**
 * Terminal escape codes for colors.
 */
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
 * Whether to apply colors. Only enabled when the output stream is a TTY.
 */
let _shouldColor = true;

try {
	_shouldColor = process.stdout.isTTY === true;
} catch {
	_shouldColor = false;
}

/**
 * Reset the color.
 */
export function reset(str: string): string {
	return `${COLORS.reset}${str}${COLORS.reset}`;
}

/**
 * Bold text.
 */
export function bold(str: string): string {
	return `${COLORS.bold}${str}${COLORS.reset}`;
}

/**
 * Red text (errors, failures).
 */
export function red(str: string): string {
	return `${COLORS.red}${str}${COLORS.reset}`;
}

/**
 * Green text (success, created, resolved).
 */
export function green(str: string): string {
	return `${COLORS.green}${str}${COLORS.reset}`;
}

/**
 * Yellow text (warnings, notes).
 */
export function yellow(str: string): string {
	return `${COLORS.yellow}${str}${COLORS.reset}`;
}

/**
 * Cyan text (labels, keys).
 */
export function cyan(str: string): string {
	return `${COLORS.cyan}${str}${COLORS.reset}`;
}

/**
 * Gray text (secondary info).
 */
export function gray(str: string): string {
	return `${COLORS.gray}${str}${COLORS.reset}`;
}

/**
 * Magenta text (highlights, IDs).
 */
export function magenta(str: string): string {
	return `${COLORS.magenta}${str}${COLORS.reset}`;
}
