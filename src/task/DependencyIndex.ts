/**
 * DependencyIndex — in-memory mapping of taskId → dependentTaskIds.
 *
 * Provides O(1) lookup for direct dependents and status checks without
 * scanning all tasks. Built from a snapshot of tasks — does not track
 * mutations.
 */

// ---------------------------------------------------------------------------
// DependencyIndex interface
// ---------------------------------------------------------------------------

import type { Task } from "src/task/types";

/**
 * Immutable dependency index built from a snapshot of tasks.
 *
 * Provides fast dependent lookup and status checking. Callers must
 * rebuild the index when the task list changes.
 */
export interface DependencyIndex {
	/**
	 * Get direct dependent task IDs for a given task ID.
	 *
	 * **Note:** Returns dependents even for task IDs that don't exist in the
	 * source list (e.g. a deleted task's dependents). Callers should verify
	 * the ID is valid before acting on the result.
	 *
	 * @param id - The task ID to look up dependents for.
	 * @returns Array of task IDs that depend on `id`. Empty if none.
	 */
	getDependents(id: string): string[];

	/**
	 * Check if a task is done (status === "done").
	 *
	 * @param id - The task ID to check.
	 * @returns True if the task exists and has status "done", false otherwise.
	 */
	isDone(id: string): boolean;
}

// ---------------------------------------------------------------------------
// DependencyIndex implementation
// ---------------------------------------------------------------------------

/**
 * Build a DependencyIndex from a list of tasks.
 *
 * Creates a mapping where each task ID maps to the set of tasks that
 * depend on it. Also builds a status map for quick done-checking.
 *
 * @param tasks - The list of tasks to index.
 * @returns A new DependencyIndex.
 */
export function buildDependencyIndex(tasks: Task[]): DependencyIndex {
	const dependents = new Map<string, string[]>();
	const status = new Map<string, boolean>();

	for (const task of tasks) {
		// Initialize status map
		status.set(task.id, task.status === "done");

		// Register this task as a dependent of each of its dependencies
		for (const depId of task.dependencies) {
			if (!dependents.has(depId)) {
				dependents.set(depId, []);
			}
			dependents.get(depId)?.push(task.id);
		}
	}

	return {
		getDependents(id: string): string[] {
			const deps = dependents.get(id);
			if (!deps) return [];
			return deps;
		},
		isDone(id: string): boolean {
			return status.get(id) ?? false;
		},
	};
}
