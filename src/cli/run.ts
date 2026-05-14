#!/usr/bin/env bun

/**
 * Slate — CLI entry point.
 *
 * Executed directly via the `bin` field in package.json (bypassing `bun run`
 * to avoid permission/sandboxing issues). Also used by `bun run start`.
 */
import { main } from "src/cli/index";

main();
