/**
 * Slate — the single public entry point for programmatic access to the store.
 *
 * It wires `LocalFileStore` to `IStore` internally and exposes convenience
 * accessors for PRD and task operations.
 */
import { PRDService } from "src/prd/PRDService";
import type { PRD, PRDError } from "src/prd/types";
import type { IStore } from "src/store/IStore";
import { LocalFileStore } from "src/store/LocalFileStore";
import type { ResolveResult } from "src/task/TaskService";
import { TaskService } from "src/task/TaskService";
import type { Task, TaskError, TaskQueryFilter } from "src/task/types";
import type { Result } from "src/utils/result";

// ---------------------------------------------------------------------------
// Slate — public entry point
// ---------------------------------------------------------------------------

/**
 * Constructor parameters for the Slate library.
 *
 * @property dir - Path to the store directory containing `prds/` and `tasks/` subdirectories.
 */
export interface SlateOptions {
	/**
	 * Path to the store directory containing `prds/` and `tasks/` subdirectories.
	 */
	dir: string;
}

/**
 * Slate — the single public entry point for programmatic access to the store.
 *
 * It wires `LocalFileStore` to `IStore` internally and exposes convenience
 * accessors for PRD and task operations.
 */
export class Slate {
	/**
	 * The underlying store implementation (private).
	 */
	readonly #store: IStore;

	/**
	 * Service for PRD operations.
	 */
	readonly prds: PRDService;

	/**
	 * Service for task operations.
	 */
	readonly tasks: TaskService;

	constructor(opts: SlateOptions) {
		this.#store = new LocalFileStore(opts.dir);
		this.prds = new PRDService(this.#store);
		this.tasks = new TaskService(this.#store);
	}

	/**
	 * Create a new PRD.
	 */
	prdCreate(params: {
		title: string;
		priority?: "high" | "medium" | "low";
		status?: "todo" | "in-progress" | "done" | "blocked";
	}): Result<PRD, PRDError> {
		return this.prds.create(params);
	}

	/**
	 * Create a new task.
	 */
	taskCreate(params: {
		title: string;
		priority?: "high" | "medium" | "low";
		status?: "todo" | "in-progress" | "done" | "blocked";
		dependencies?: string[];
		prd?: string;
	}): Result<Task, TaskError | PRDError> {
		return this.tasks.create(params);
	}

	/**
	 * Query tasks with a filter function.
	 */
	taskQuery(filter: TaskQueryFilter): Result<Task[], TaskError> {
		const listResult = this.#store.listTasks();
		if (!listResult.ok) {
			return listResult;
		}

		const filtered = listResult.value.filter(filter);
		return { ok: true, value: filtered };
	}

	/**
	 * Resolve (mark as done) a task by ID.
	 * Returns the list of dependent tasks that became unblocked.
	 */
	taskResolve(id: string): Result<ResolveResult, TaskError> {
		return this.tasks.resolve(id);
	}

	/**
	 * Update a task's status and/or priority.
	 */
	taskUpdate(
		id: string,
		updates: {
			status?: "todo" | "in-progress" | "done" | "blocked";
			priority?: "high" | "medium" | "low";
		},
	): Result<void, TaskError> {
		return this.tasks.update(id, updates);
	}
}
