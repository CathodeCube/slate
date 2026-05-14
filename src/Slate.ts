import { PRDService } from "src/prd/PRDService";
import type { PRD, PRDError } from "src/prd/types";
import type { IStore } from "src/store/IStore";
import { LocalFileStore } from "src/store/LocalFileStore";
import type { Task, TaskError, TaskQueryFilter } from "src/task";
import { TaskService } from "src/task/TaskService";
import type { Result } from "src/utils/result";

// ---------------------------------------------------------------------------
// Slate — public entry point
// ---------------------------------------------------------------------------

/**
 * Constructor parameters for the Slate library.
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
	 * The underlying store implementation.
	 */
	readonly store: IStore;

	/**
	 * Service for PRD operations.
	 */
	readonly prds: PRDService;

	/**
	 * Service for task operations.
	 */
	readonly tasks: TaskService;

	constructor(opts: SlateOptions) {
		this.store = new LocalFileStore(opts.dir);
		this.prds = new PRDService(this.store);
		this.tasks = new TaskService(this.store);
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
		const listResult = this.store.listTasks();
		if (!listResult.ok) {
			return listResult;
		}

		const filtered = listResult.value.filter(filter);
		return { ok: true, value: filtered };
	}

	/**
	 * Resolve (mark as done) a task by ID.
	 */
	taskResolve(id: string): Result<void, TaskError> {
		return this.tasks.resolve(id);
	}
}
