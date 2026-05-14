#!/usr/bin/env bun

/**
 * Slate — CLI entry point.
 *
 * Executed directly via the `bin` field in package.json (bypassing `bun run`
 * to avoid permission/sandboxing issues). Also used by `bun run start`.
 */

import { Command } from "commander";
import { planCmd } from "src/cli/commands/plan";
import { prdCreateCmd, prdListCmd, prdShowCmd } from "src/cli/commands/prd";
import {
	taskCreateCmd,
	taskDeleteCmd,
	taskListCmd,
	taskResolveCmd,
	taskUpdateCmd,
} from "src/cli/commands/task";

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

/**
 * Default store directory used by CLI commands.
 */
const DEFAULT_STORE_DIR = "./slate";

/**
 * Initialize and run the Slate CLI.
 */
const program = new Command();

program
	.name("slate")
	.description("A minimal, agent-native issue tracker")
	.version("0.0.1");

// -- plan command ---------------------------------------------------------
program.addCommand(planCmd(DEFAULT_STORE_DIR));

// -- prd subcommand -------------------------------------------------------
const prdCmd = new Command("prd");
prdCmd.description("PRD management commands");
prdCmd.addCommand(prdListCmd(DEFAULT_STORE_DIR));
prdCmd.addCommand(prdShowCmd(DEFAULT_STORE_DIR));
prdCmd.addCommand(prdCreateCmd(DEFAULT_STORE_DIR));
program.addCommand(prdCmd);

// -- task subcommand ------------------------------------------------------
const taskCmd = new Command("task");
taskCmd.description("Task management commands");
taskCmd.addCommand(taskListCmd(DEFAULT_STORE_DIR));
taskCmd.addCommand(taskUpdateCmd(DEFAULT_STORE_DIR));
taskCmd.addCommand(taskCreateCmd(DEFAULT_STORE_DIR));
taskCmd.addCommand(taskResolveCmd(DEFAULT_STORE_DIR));
taskCmd.addCommand(taskDeleteCmd(DEFAULT_STORE_DIR));
program.addCommand(taskCmd);

program.parse();
