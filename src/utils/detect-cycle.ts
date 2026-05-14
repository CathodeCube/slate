/**
 * DFS-based dependency cycle detection utility.
 *
 * Internal helper used by `TaskService.resolve` to detect circular
 * dependencies before marking a task as done.
 */

// ---------------------------------------------------------------------------
// Cycle detection helpers (internal)
// ---------------------------------------------------------------------------

/**
 * Internal interface for cycle detection — allows callers to supply
 * a task lookup function without exposing the full Task type.
 */
type TaskLookup = (id: string) => { dependencies: string[] } | null;

/**
 * Detect a dependency cycle starting from `taskId` using DFS.
 * Returns the cycle path if one exists, or null if no cycle.
 *
 * @internal
 */
export function detectCycle(
	taskId: string,
	getTask: TaskLookup,
): string[] | null {
	const visited = new Set<string>();
	const path: string[] = [];

	function dfs(id: string): string[] | null {
		if (visited.has(id)) {
			// Found a cycle — extract the cycle from path
			const cycleStart = path.indexOf(id);
			if (cycleStart !== -1) {
				return path.slice(cycleStart).concat(id);
			}
			return null;
		}

		const task = getTask(id);
		if (!task) {
			return null;
		}

		visited.add(id);
		path.push(id);

		for (const dep of task.dependencies) {
			const cycle = dfs(dep);
			if (cycle) {
				return cycle;
			}
		}

		path.pop();
		return null;
	}

	return dfs(taskId);
}
