import { Command } from "commander";
import { LocalFileStore } from "src/store/LocalFileStore";
import { TaskService } from "src/task/TaskService";

// ---------------------------------------------------------------------------
// Priority ordering
// ---------------------------------------------------------------------------

/**
 * Map priority string to a numeric sort key (lower = higher priority).
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

export function planCmd(defaultDir: string): Command {
	const cmd = new Command("plan");
	cmd.description("Show the next actionable task");
	cmd.option("--dir <dir>", "Store directory", defaultDir);
	cmd.action(async (opts: { dir: string }) => {
		const store = new LocalFileStore(opts.dir);
		const service = new TaskService(store);

		const listResult = service.list();

		if (!listResult.ok) {
			process.stderr.write(
				`Error: Failed to list tasks: ${listResult.error.kind}\n`,
			);
			process.exit(1);
		}

		const allTasks = listResult.value;

		if (allTasks.length === 0) {
			console.log("No actionable tasks — all tasks are done or blocked.");
			return;
		}

		// Cache done status to avoid N+1 file reads
		const doneCache = new Map<string, boolean>();
		const isTaskDone = (id: string): boolean => {
			if (!doneCache.has(id)) {
				const readResult = store.readTask(id);
				doneCache.set(id, readResult.ok && readResult.value.status === "done");
			}
			return doneCache.get(id) ?? false;
		};

		// Check if any task is not done/blocked (regardless of deps)
		const hasNonDoneTask = allTasks.some(
			(task) => task.status !== "done" && task.status !== "blocked",
		);

		// Filter to actionable tasks: not done, not blocked, all deps done
		const actionable = allTasks.filter((task) => {
			if (task.status === "done" || task.status === "blocked") {
				return false;
			}
			return task.dependencies.every((depId) => isTaskDone(depId));
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
