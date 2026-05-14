/**
 * CLI command that shows the next actionable task.
 *
 * An actionable task is one that is not done or blocked and has all
 * its dependencies satisfied. Tasks are sorted by priority (high → medium
 * → low) then by creation date.
 */
import { Command } from "commander";
import { handleError } from "src/cli/error";
import { createSlate } from "src/Slate/factory";
import { buildDependencyIndex } from "src/task/DependencyIndex";

// ---------------------------------------------------------------------------
// Priority ordering
// ---------------------------------------------------------------------------

/**
 * Map a priority string to a numeric sort key for ordering.
 *
 * Lower numbers represent higher priority:
 *   - `"high"` → 0
 *   - `"medium"` → 1
 *   - `"low"` → 2
 *
 * @param priority - The priority string to map.
 * @returns A numeric sort key (0 for high, 1 for medium, 2 for low, 3 for unknown).
 */
function priorityKey(priority: string): number {
	switch (priority) {
		case "high":
			return 0;
		case "medium":
			return 1;
		case "low":
			return 2;
		default:
			return 3;
	}
}

// ---------------------------------------------------------------------------
// plan command
// ---------------------------------------------------------------------------

const DEFAULT_DIR = "./slate";

/**
 * Create the `plan` CLI command.
 *
 * Shows the next actionable task — the highest-priority task whose
 * dependencies are all satisfied. Tasks are sorted by priority (high →
 * medium → low) then by creation date.
 *
 * @returns The configured Commander command.
 */
export function planCmd(): Command {
	const cmd = new Command("plan");
	cmd.description("Show the next actionable task");
	cmd.action(async () => {
		const slate = createSlate(DEFAULT_DIR);

		const listResult = slate.taskList();

		if (!listResult.ok) {
			handleError(listResult.error);
		}

		const allTasks = listResult.value;

		if (allTasks.length === 0) {
			console.log("No actionable tasks — all tasks are done or blocked.");
			return;
		}

		// Build a DependencyIndex for O(1) status lookups
		const index = buildDependencyIndex(allTasks);

		// Check if any task is not done/blocked (regardless of deps)
		const hasNonDoneTask = allTasks.some(
			(task) => task.status !== "done" && task.status !== "blocked",
		);

		// Filter to actionable tasks: not done, not blocked, all deps done
		const actionable = allTasks.filter((task) => {
			if (task.status === "done" || task.status === "blocked") {
				return false;
			}
			return task.dependencies.every((depId) => index.isDone(depId));
		});

		if (actionable.length === 0) {
			if (hasNonDoneTask) {
				console.log("No unblocked tasks available.");
			} else {
				console.log("No actionable tasks — all tasks are done or blocked.");
			}
			return;
		}

		// Sort by priority (high → medium → low), then by creation date
		actionable.sort((a, b) => {
			const pa = priorityKey(a.priority);
			const pb = priorityKey(b.priority);
			if (pa !== pb) return pa - pb;
			return a.created.localeCompare(b.created);
		});

		const next = actionable[0];

		console.log(`Next actionable task:`);
		console.log(`  ID:       ${next.id}`);
		console.log(`  Title:    ${next.title}`);
		console.log(`  Status:   ${next.status}`);
		console.log(`  Priority: ${next.priority}`);
	});
	return cmd;
}
