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
	 * TaskService requires listing all tasks at construction time, which is now async.
	 */
	readonly #tasksPromise: Promise<TaskService>;

	constructor(opts: SlateOptions) {
		this.#store = new LocalFileStore(opts.dir);
		this.#prds = new PRDService(this.#store);
		this.#tasksPromise = this.#initTasks();
	}

	/**
	 * Initialize the TaskService by listing all tasks and building the dependency index.
	 * This is deferred to avoid requiring an async constructor.
	 */
	async #initTasks(): Promise<TaskService> {
		const tasksResult = await this.#store.listTasks();
		if (!tasksResult.ok) {
			throw new SlateConstructionError(mapTaskError(tasksResult.error));
		}
		const index = buildDependencyIndex(tasksResult.value);
		return new TaskService(this.#store, index);
	}

	/**
	 * Get the initialized TaskService, initializing it if necessary.
	 */
	async #getTasks(): Promise<TaskService> {
		if (!this.#tasksPromise) {
			throw new SlateConstructionError({
				kind: "task-directory-invalid",
				path: (this.#store as LocalFileStore).dir,
				reason: "TaskService not yet initialized",
			});
		}
		return this.#tasksPromise;
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
		const tasks = await this.#getTasks();
		const result = await tasks.create(params);
		if (!result.ok) {
			return { ok: false, error: mapTaskError(result.error) };
		}
		return result;
	}

	async taskRead(id: string): Promise<Result<Task, SlateError>> {
		const tasks = await this.#getTasks();
		const result = await tasks.read(id);
		if (!result.ok) {
			return { ok: false, error: mapTaskError(result.error) };
		}
		return result;
	}

	async taskList(
		filter?: TaskQueryFilter,
	): Promise<Result<Task[], SlateError>> {
		const tasks = await this.#getTasks();
		const result = await tasks.list();
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
		const tasks = await this.#getTasks();
		const result = await tasks.update(id, updates);
		if (!result.ok) {
			return { ok: false, error: mapTaskError(result.error) };
		}
		return result;
	}

	async taskResolve(id: string): Promise<Result<ResolveResult, SlateError>> {
		const tasks = await this.#getTasks();
		const result = await tasks.resolve(id);
		if (!result.ok) {
			return { ok: false, error: mapTaskError(result.error) };
		}
		return result;
	}

	async taskDelete(id: string): Promise<Result<void, SlateError>> {
		const tasks = await this.#getTasks();
		const result = await tasks.delete(id);
		if (!result.ok) {
			return { ok: false, error: mapTaskError(result.error) };
		}
		return result;
	}
}

// ---------------------------------------------------------------------------
// SlateConstructionError — thrown when the Slate facade cannot initialize
// ---------------------------------------------------------------------------

/**
 * Error thrown when the Slate facade cannot be constructed because the
 * underlying store is in an invalid state (e.g. tasks cannot be listed).
 *
 * Unlike `SlateError` which is returned by individual operations, this is
 * a thrown exception because a constructor failure means the entire facade
 * is unusable — there is no `Result` to return.
 */
export class SlateConstructionError extends Error {
	readonly kind: SlateError["kind"];

	constructor(error: SlateError) {
		super(`[slate] Failed to initialize: ${JSON.stringify(error)}`);
		this.name = "SlateConstructionError";
		this.kind = error.kind;
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
