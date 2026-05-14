import type { PRDError, Task, TaskError } from "src/prd/types";
import type { IStore } from "src/store/IStore";
import type { Result } from "src/utils/result";

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
	 * Resolve a task by marking it as done.
	 */
	resolve(id: string): Result<void, TaskError> {
		const readResult = this.store.readTask(id);
		if (!readResult.ok) {
			return { ok: false, error: readResult.error };
		}

		const task = readResult.value;
		task.status = "done";
		task.updated = new Date().toISOString();

		const writeResult = this.store.createTask(task);
		if (!writeResult.ok) {
			return writeResult;
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
