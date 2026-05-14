import type { PRDError, Task, TaskError } from "src/prd/types";
import type { IStore } from "src/store/IStore";
import type { Result } from "src/utils/result";

// ---------------------------------------------------------------------------
// Resolve result
// ---------------------------------------------------------------------------

/**
 * Result of resolving a task — includes the list of dependent tasks that
 * became unblocked as a consequence.
 */
export interface ResolveResult {
	/**
	 * IDs of tasks that were previously blocked and are now unblocked.
	 */
	unblocked: string[];
}

// ---------------------------------------------------------------------------
// Cycle detection helpers
// ---------------------------------------------------------------------------

/**
 * Detect a dependency cycle starting from `taskId` using DFS.
 * Returns the cycle path if one exists, or null if no cycle.
 */
function detectCycle(
	taskId: string,
	getTask: (id: string) => Task | null,
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

// ---------------------------------------------------------------------------
// TaskService
// ---------------------------------------------------------------------------

/**
 * Service layer for task operations. Encapsulates business logic such as
 * ID generation, default values, and validation.
 */
export class TaskService {
	constructor(private store: IStore) {}

	/**
	 * Read a task by ID.
	 */
	read(id: string): Result<Task, TaskError> {
		return this.store.readTask(id);
	}

	/**
	 * List all tasks from the store.
	 */
	list(): Result<Task[], TaskError> {
		return this.store.listTasks();
	}

	/**
	 * Create a new task with default values.
	 */
	create(params: {
		title: string;
		priority?: "high" | "medium" | "low";
		status?: "todo" | "in-progress" | "done" | "blocked";
		dependencies?: string[];
		prd?: string;
	}): Result<Task, TaskError | PRDError> {
		const title = params.title.trim();
		if (!title) {
			return {
				ok: false,
				error: { kind: "invalid-title", message: "Title must not be empty" },
			};
		}

		const status = params.status ?? "todo";
		const priority = params.priority ?? "medium";
		const dependencies = params.dependencies ?? [];

		// Validate status
		if (!["todo", "in-progress", "done", "blocked"].includes(status)) {
			return {
				ok: false,
				error: { kind: "invalid-status", status },
			};
		}

		// Validate priority
		if (!["high", "medium", "low"].includes(priority)) {
			return {
				ok: false,
				error: { kind: "invalid-priority", priority },
			};
		}

		const now = new Date().toISOString();

		const task: Task = {
			id: this.store.nextTaskID(),
			title,
			status,
			priority,
			dependencies,
			...(params.prd !== undefined && { prd: params.prd }),
			created: now,
			updated: now,
		};

		const result = this.store.createTask(task);
		if (!result.ok) {
			return result;
		}

		return { ok: true, value: task };
	}

	/**
	 * Resolve a task by marking it as done, detecting dependency cycles
	 * and identifying dependent tasks that become unblocked.
	 */
	resolve(id: string): Result<ResolveResult, TaskError> {
		const readResult = this.store.readTask(id);
		if (!readResult.ok) {
			return { ok: false, error: readResult.error };
		}

		const task = readResult.value;

		// Check for dependency cycles before modifying state
		const cycle = detectCycle(id, (depId) => {
			const depResult = this.store.readTask(depId);
			if (!depResult.ok) return null;
			return depResult.value;
		});
		if (cycle) {
			return { ok: false, error: { kind: "cycle-detected", cycle } };
		}

		// Mark the task as done
		task.status = "done";
		task.updated = new Date().toISOString();

		const writeResult = this.store.createTask(task);
		if (!writeResult.ok) {
			return writeResult;
		}

		// Find dependent tasks that are now unblocked
		const listResult = this.store.listTasks();
		if (!listResult.ok) {
			return { ok: false, error: listResult.error };
		}

		const unblocked: string[] = [];
		for (const depTask of listResult.value) {
			if (depTask.dependencies.includes(id)) {
				const allDone = depTask.dependencies.every((depId) =>
					this.isTaskDone(depId),
				);
				if (allDone) {
					unblocked.push(depTask.id);
				}
			}
		}

		return { ok: true, value: { unblocked } };
	}

	/**
	 * Check if a task is done by reading it from the store.
	 */
	private isTaskDone(id: string): boolean {
		const result = this.store.readTask(id);
		if (!result.ok) return false;
		return result.value.status === "done";
	}

	/**
	 * Delete a task by ID.
	 */
	delete(id: string): Result<void, TaskError> {
		const readResult = this.store.readTask(id);
		if (!readResult.ok) {
			return { ok: false, error: readResult.error };
		}

		const deleteResult = this.store.deleteTask(id);
		if (!deleteResult.ok) {
			return { ok: false, error: deleteResult.error };
		}

		return { ok: true, value: undefined };
	}

	/**
	 * Update a task's status and/or priority.
	 */
	update(
		id: string,
		updates: {
			status?: "todo" | "in-progress" | "done" | "blocked";
			priority?: "high" | "medium" | "low";
		},
	): Result<void, TaskError> {
		const readResult = this.store.readTask(id);
		if (!readResult.ok) {
			return { ok: false, error: readResult.error };
		}

		const task = readResult.value;

		if (updates.status !== undefined) {
			if (
				!["todo", "in-progress", "done", "blocked"].includes(updates.status)
			) {
				return {
					ok: false,
					error: { kind: "invalid-status", status: updates.status },
				};
			}
			task.status = updates.status;
		}

		if (updates.priority !== undefined) {
			if (!["high", "medium", "low"].includes(updates.priority)) {
				return {
					ok: false,
					error: { kind: "invalid-priority", priority: updates.priority },
				};
			}
			task.priority = updates.priority;
		}

		task.updated = new Date().toISOString();

		const writeResult = this.store.createTask(task);
		if (!writeResult.ok) {
			return writeResult;
		}

		return { ok: true, value: undefined };
	}
}
