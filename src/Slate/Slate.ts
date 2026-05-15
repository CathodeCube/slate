/**
 * Slate — the single public entry point for programmatic access to the store.
 *
 * Implements `ISlate` by wiring `LocalFileStore` to `IStore` internally and
 * delegating to `PRDService` and `TaskService`. Callers interact only through
 * `ISlate` — they never see `LocalFileStore`, `PRDService`, `TaskService`, or
 * the raw error types (`PRDError`, `TaskError`).
 */

import { PRDService } from "src/prd/PRDService";
import type { PRD, PRDError } from "src/prd/types";
import type { IStore } from "src/store/IStore";
import { LocalFileStore } from "src/store/LocalFileStore";
import { buildDependencyIndex } from "src/task/DependencyIndex";
import { TaskService } from "src/task/TaskService";
import type {
	ResolveResult,
	Task,
	TaskError,
	TaskQueryFilter,
} from "src/task/types";
import type { Result } from "src/utils/result";

import type { ISlate, SlateError } from "./ISlate";

export type { ISlate, ResolveResult, SlateError } from "./ISlate";

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
 * Error returned when the Slate facade cannot be constructed because the
 * underlying store is in an invalid state (e.g. tasks cannot be listed).
 *
 * Unlike `SlateError` which is returned by individual operations, this error
 * is returned via `Result` because a failed construction means the entire
 * facade is unusable.
 */
export type SlateConstructionError = SlateError;

/**
 * Slate — the single public entry point for programmatic access to the store.
 *
 * Implements `ISlate` by wiring `LocalFileStore` to `IStore` internally and
 * delegating to `PRDService` and `TaskService`. Callers interact only through
 * `ISlate` — they never see `LocalFileStore`, `PRDService`, `TaskService`, or
 * the raw error types (`PRDError`, `TaskError`).
 */
export class Slate implements ISlate {
	/**
	 * The underlying store implementation (private).
	 */
	readonly #store: IStore;

	/**
	 * Service for PRD operations.
	 */
	readonly #prds: PRDService;

	/**
	 * Deferred task service initialization promise.
	 * TaskService requires listing all tasks at construction time, which is async.
	 */
	readonly #tasksPromise: Promise<TaskService>;

	/**
	 * Create a new Slate instance asynchronously.
	 *
	 * Construction is async because the TaskService requires listing all tasks
	 * at initialization time, which involves file I/O.
	 *
	 * @param opts - The Slate construction options.
	 * @returns A new Slate instance, or a Result with a SlateConstructionError
	 *          if the store is in an invalid state.
	 */
	static async create(
		opts: SlateOptions,
	): Promise<Result<Slate, SlateConstructionError>> {
		try {
			const store = new LocalFileStore(opts.dir);
			const prds = new PRDService(store);
			const tasksPromise = Slate.#initTasks(store);

			// Try to eagerly initialize tasks — if it fails, return the error
			await tasksPromise;

			const instance = new Slate(store, prds, tasksPromise);
			return { ok: true, value: instance };
		} catch (e) {
			const error = e as SlateConstructionError;
			return { ok: false, error };
		}
	}

	/**
	 * Initialize the TaskService by listing all tasks and building the dependency index.
	 */
	static async #initTasks(store: IStore): Promise<TaskService> {
		const tasksResult = await store.listTasks();
		if (!tasksResult.ok) {
			throw mapTaskError(tasksResult.error);
		}
		const index = buildDependencyIndex(tasksResult.value);
		return new TaskService(store, index);
	}

	private constructor(
		store: IStore,
		prds: PRDService,
		tasksPromise: Promise<TaskService>,
	) {
		this.#store = store;
		this.#prds = prds;
		this.#tasksPromise = tasksPromise;
	}

	// -- PRD operations -------------------------------------------------------

	async prdCreate(params: {
		title: string;
		priority?: "high" | "medium" | "low";
	}): Promise<Result<PRD, SlateError>> {
		const result = await this.#prds.create(params);
		if (!result.ok) {
			return { ok: false, error: mapPRDError(result.error) };
		}
		return result;
	}

	async prdRead(id: string): Promise<Result<PRD, SlateError>> {
		const result = await this.#prds.read(id);
		if (!result.ok) {
			return { ok: false, error: mapPRDError(result.error) };
		}
		return result;
	}

	async prdList(): Promise<Result<PRD[], SlateError>> {
		const result = await this.#prds.list();
		if (!result.ok) {
			return { ok: false, error: mapPRDError(result.error) };
		}
		return result;
	}

	// -- Task operations ------------------------------------------------------

	async taskCreate(params: {
		title: string;
		priority?: "high" | "medium" | "low";
		status?: "todo" | "in-progress" | "done" | "blocked";
		dependencies?: string[];
		prd?: string;
	}): Promise<Result<Task, SlateError>> {
		const result = await this.#tasksPromise.then((tasks) =>
			tasks.create(params),
		);
		if (!result.ok) {
			return { ok: false, error: mapTaskError(result.error) };
		}
		return result;
	}

	async taskRead(id: string): Promise<Result<Task, SlateError>> {
		const result = await this.#tasksPromise.then((tasks) => tasks.read(id));
		if (!result.ok) {
			return { ok: false, error: mapTaskError(result.error) };
		}
		return result;
	}

	async taskList(
		filter?: TaskQueryFilter,
	): Promise<Result<Task[], SlateError>> {
		const result = await this.#tasksPromise.then((tasks) => tasks.list());
		if (!result.ok) {
			return { ok: false, error: mapTaskError(result.error) };
		}
		if (result.ok && filter) {
			return { ok: true, value: result.value.filter(filter) };
		}
		return result;
	}

	async taskUpdate(
		id: string,
		updates: {
			status?: "todo" | "in-progress" | "done" | "blocked";
			priority?: "high" | "medium" | "low";
			title?: string;
		},
	): Promise<Result<void, SlateError>> {
		const result = await this.#tasksPromise.then((tasks) =>
			tasks.update(id, updates),
		);
		if (!result.ok) {
			return { ok: false, error: mapTaskError(result.error) };
		}
		return result;
	}

	async taskResolve(id: string): Promise<Result<ResolveResult, SlateError>> {
		const result = await this.#tasksPromise.then((tasks) => tasks.resolve(id));
		if (!result.ok) {
			return { ok: false, error: mapTaskError(result.error) };
		}
		return result;
	}

	async taskDelete(id: string): Promise<Result<void, SlateError>> {
		const result = await this.#tasksPromise.then((tasks) => tasks.delete(id));
		if (!result.ok) {
			return { ok: false, error: mapTaskError(result.error) };
		}
		return result;
	}
}

// ---------------------------------------------------------------------------
// Error mapping — hides internal error types from callers
// ---------------------------------------------------------------------------

function mapPRDError(error: PRDError): SlateError {
	switch (error.kind) {
		case "not-found":
			return { kind: "prd-not-found", id: error.id };
		case "invalid-title":
			return { kind: "prd-invalid-title", message: error.message };
		case "invalid-status":
			return { kind: "prd-invalid-status", status: error.status };
		case "corrupted-file":
			return {
				kind: "prd-corrupted-file",
				id: error.id,
				message: error.message,
			};
		case "already-exists":
			return { kind: "prd-already-exists", id: error.id };
		case "directory-invalid":
			return {
				kind: "prd-directory-invalid",
				path: error.path,
				reason: error.reason,
			};
	}
}

function mapTaskError(error: TaskError | PRDError): SlateError {
	switch (error.kind) {
		case "not-found":
			return { kind: "task-not-found", id: error.id };
		case "invalid-title":
			return { kind: "task-invalid-title", message: error.message };
		case "invalid-status":
			return { kind: "task-invalid-status", status: error.status };
		case "invalid-priority":
			return { kind: "task-invalid-priority", priority: error.priority };
		case "corrupted-file":
			return {
				kind: "task-corrupted-file",
				id: error.id,
				message: error.message,
			};
		case "already-exists":
			return { kind: "task-already-exists", id: error.id };
		case "already-done":
			return { kind: "task-already-done", id: error.id };
		case "directory-invalid":
			return {
				kind: "task-directory-invalid",
				path: error.path,
				reason: error.reason,
			};
	}
}
