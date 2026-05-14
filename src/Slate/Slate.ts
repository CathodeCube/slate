/**
 * Slate — the single public entry point for programmatic access to the store.
 *
 * Implements `ISlate` by wiring `LocalFileStore` to `IStore` internally and
 * delegating to `PRDService` and `TaskService`. Callers interact only through
 * `ISlate` — they never see `LocalFileStore`, `PRDService`, `TaskService`, or
 * the raw error types (`PRDError`, `TaskError`).
 */

import { PRDService } from "src/prd/PRDService";
import type { PRD } from "src/prd/types";
import type { IStore } from "src/store/IStore";
import { LocalFileStore } from "src/store/LocalFileStore";
import { buildDependencyIndex } from "src/task/DependencyIndex";
import { TaskService } from "src/task/TaskService";
import type { Task, TaskQueryFilter } from "src/task/types";
import type { Result } from "src/utils/result";

import type { ISlate, ResolveResult, SlateError } from "./ISlate";

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
	 * Service for task operations.
	 */
	readonly #tasks: TaskService;

	constructor(opts: SlateOptions) {
		this.#store = new LocalFileStore(opts.dir);
		this.#prds = new PRDService(this.#store);
		const tasksResult = this.#store.listTasks();
		const index = tasksResult.ok
			? buildDependencyIndex(tasksResult.value)
			: buildDependencyIndex([]);
		this.#tasks = new TaskService(this.#store, index);
	}

	// -- PRD operations -------------------------------------------------------

	prdCreate(params: {
		title: string;
		priority?: "high" | "medium" | "low";
		status?: "todo" | "in-progress" | "done" | "blocked";
	}): Result<PRD, SlateError> {
		const result = this.#prds.create(params);
		if (!result.ok) {
			return { ok: false, error: mapPRDError(result.error) };
		}
		return result;
	}

	prdRead(id: string): Result<PRD, SlateError> {
		const result = this.#prds.read(id);
		if (!result.ok) {
			return { ok: false, error: mapPRDError(result.error) };
		}
		return result;
	}

	prdList(): Result<PRD[], SlateError> {
		const result = this.#prds.list();
		if (!result.ok) {
			return { ok: false, error: mapPRDError(result.error) };
		}
		return result;
	}

	// -- Task operations ------------------------------------------------------

	taskCreate(params: {
		title: string;
		priority?: "high" | "medium" | "low";
		status?: "todo" | "in-progress" | "done" | "blocked";
		dependencies?: string[];
		prd?: string;
	}): Result<Task, SlateError> {
		const result = this.#tasks.create(params);
		if (!result.ok) {
			return { ok: false, error: mapTaskError(result.error) };
		}
		return result;
	}

	taskRead(id: string): Result<Task, SlateError> {
		const result = this.#tasks.read(id);
		if (!result.ok) {
			return { ok: false, error: mapTaskError(result.error) };
		}
		return result;
	}

	taskList(filter?: TaskQueryFilter): Result<Task[], SlateError> {
		const result = this.#tasks.list();
		if (!result.ok) {
			return { ok: false, error: mapTaskError(result.error) };
		}
		if (result.ok && filter) {
			return { ok: true, value: result.value.filter(filter) };
		}
		return result;
	}

	taskUpdate(
		id: string,
		updates: {
			status?: "todo" | "in-progress" | "done" | "blocked";
			priority?: "high" | "medium" | "low";
		},
	): Result<void, SlateError> {
		const result = this.#tasks.update(id, updates);
		if (!result.ok) {
			return { ok: false, error: mapTaskError(result.error) };
		}
		return result;
	}

	taskResolve(id: string): Result<ResolveResult, SlateError> {
		const result = this.#tasks.resolve(id);
		if (!result.ok) {
			return { ok: false, error: mapTaskError(result.error) };
		}
		return result;
	}

	taskDelete(id: string): Result<void, SlateError> {
		const result = this.#tasks.delete(id);
		if (!result.ok) {
			return { ok: false, error: mapTaskError(result.error) };
		}
		return result;
	}
}

// ---------------------------------------------------------------------------
// Error mapping — hides internal error types from callers
// ---------------------------------------------------------------------------

import type { PRDError } from "src/prd/types";

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

import type { TaskError } from "src/task/types";

function mapTaskError(error: TaskError | PRDError): SlateError {
	// Task.create can return PRDError when the referenced PRD is not found
	if (error.kind === "not-found") {
		return { kind: "task-not-found", id: (error as { id: string }).id };
	}
	if (error.kind === "invalid-title") {
		return {
			kind: "task-invalid-title",
			message: (error as { message: string }).message,
		};
	}
	if (error.kind === "invalid-status") {
		return {
			kind: "task-invalid-status",
			status: (error as { status: string }).status,
		};
	}
	if (error.kind === "invalid-priority") {
		return {
			kind: "task-invalid-priority",
			priority: (error as { priority: string }).priority,
		};
	}
	if (error.kind === "corrupted-file") {
		return {
			kind: "task-corrupted-file",
			id: (error as { id: string }).id,
			message: (error as { message: string }).message,
		};
	}
	if (error.kind === "already-exists") {
		return {
			kind: "task-already-exists",
			id: (error as { id: string }).id,
		};
	}
	if (error.kind === "already-done") {
		return { kind: "task-already-done", id: (error as { id: string }).id };
	}
	if (error.kind === "directory-invalid") {
		return {
			kind: "task-directory-invalid",
			path: (error as { path: string }).path,
			reason: (error as { reason: string }).reason,
		};
	}
	// Exhaustive — TaskError covers all cases above
	return { kind: "task-directory-invalid", path: "unknown", reason: "unknown" };
}
