/**
 * Service layer for task operations.
 *
 * Encapsulates business logic such as ID generation, default values, and
 * validation. Depends on `IStore` via constructor injection.
 */
import type { PRDError } from "src/prd/types";
import type { IStore } from "src/store/IStore";
import type { DependencyIndex } from "src/task/DependencyIndex";
import { buildDependencyIndex } from "src/task/DependencyIndex";
import type { ResolveResult, Task, TaskError } from "src/task/types";
import type { Result } from "src/utils/result";

// ---------------------------------------------------------------------------
// TaskService
// ---------------------------------------------------------------------------

/**
 * Service layer for task operations.
 *
 * Encapsulates business logic such as ID generation, default values, and
 * validation. Depends on `IStore` and `DependencyIndex` via constructor injection.
 */
export class TaskService {
	#index: DependencyIndex;

	/**
	 * Create a new TaskService backed by the given store and dependency index.
	 *
	 * @param store - The store implementation used for task persistence.
	 * @param index - The dependency index for fast dependent lookup.
	 */
	constructor(
		private store: IStore,
		index: DependencyIndex,
	) {
		this.#index = index;
	}

	/**
	 * Read a task by ID.
	 *
	 * @param id - The task ID to read.
	 * @returns The task entity on success, or an error if the task is not found or corrupted.
	 */
	read(id: string): Result<Task, TaskError> {
		return this.store.readTask(id);
	}

	/**
	 * List all tasks from the store.
	 *
	 * @returns All task entities on success, or an error if the store directory is invalid.
	 */
	list(): Result<Task[], TaskError> {
		return this.store.listTasks();
	}

	/**
	 * Create a new task with default values.
	 *
	 * @param params - The task creation parameters.
	 * @param params.title - The task title (must not be empty after trimming).
	 * @param params.priority - Optional priority level. Defaults to `"medium"`.
	 * @param params.status - Optional status. Defaults to `"todo"`.
	 * @param params.dependencies - Optional dependency task IDs.
	 * @param params.prd - Optional parent PRD ID.
	 * @returns The created task on success, or an error if validation fails or the store write fails.
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

		// Validate PRD reference if provided
		if (params.prd !== undefined) {
			if (!this.store.existsPRD(params.prd)) {
				return {
					ok: false,
					error: { kind: "not-found", id: params.prd },
				};
			}
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
	 * Resolve a task by marking it as done and identifying dependent tasks
	 * that become unblocked.
	 *
	 * @param id - The task ID to resolve.
	 * @returns The resolve result with unblocked task IDs on success, or an error if the task is not found or already done.
	 */
	resolve(id: string): Result<ResolveResult, TaskError> {
		const readResult = this.store.readTask(id);
		if (!readResult.ok) {
			return { ok: false, error: readResult.error };
		}

		// Reject resolving an already-done task
		if (readResult.value.status === "done") {
			return { ok: false, error: { kind: "already-done", id } };
		}

		const task: Task = { ...readResult.value };

		// Mark the task as done
		task.status = "done";
		task.updated = new Date().toISOString();

		const writeResult = this.store.updateTask(task);
		if (!writeResult.ok) {
			return writeResult;
		}

		// Rebuild the index to reflect the updated state
		const listResult = this.store.listTasks();
		if (!listResult.ok) {
			return { ok: false, error: listResult.error };
		}
		const newIndex = buildDependencyIndex(listResult.value);

		// Update the stored index to reflect the new state
		this.#index = newIndex;

		// Find direct dependents that are now fully unblocked
		const unblocked: string[] = [];
		for (const depId of this.#index.getDependents(id)) {
			const depTaskResult = this.store.readTask(depId);
			if (!depTaskResult.ok) continue;

			const allDepsDone = depTaskResult.value.dependencies.every((depId2) =>
				this.#index.isDone(depId2),
			);
			if (allDepsDone) {
				unblocked.push(depId);
			}
		}

		return { ok: true, value: { unblocked } };
	}

	/**
	 * Delete a task by ID.
	 *
	 * @param id - The task ID to delete.
	 * @returns Success on deletion, or an error if the task is not found.
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
	 *
	 * @param id - The task ID to update.
	 * @param updates - The fields to update.
	 * @param updates.status - Optional new status value.
	 * @param updates.priority - Optional new priority value.
	 * @returns Success on update, or an error if the task is not found or the values are invalid.
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

		const writeResult = this.store.updateTask(task);
		if (!writeResult.ok) {
			return writeResult;
		}

		return { ok: true, value: undefined };
	}
}
