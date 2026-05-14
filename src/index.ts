/**
 * Slate — library entry point.
 *
 * When imported as a module, this exposes the `Slate` class for programmatic
 * access. When run via `bun run start` or the `slate` binary, it initializes
 * the Commander CLI and delegates to the command handlers.
 */
export { Slate, type SlateOptions } from "src/Slate";

// CLI entry point (only executes when run directly, not when imported)
import { main } from "src/cli";

main();
