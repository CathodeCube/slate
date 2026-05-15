/**
 * Narrow interface for the Slate facade — the public API contract.
 *
 * Callers depend on this interface, not on `Slate` or on service/store types.
 * This enables swapping implementations (e.g., `MemoryStore`) without changing
 * caller code.
 */
import type { PRD } from "src/prd/types";
import type { ResolveResult, Task, TaskQueryFilter } from "src/task/types";
import type { Result } from "src/utils/result";

export type { ResolveResult } from "src/task/types";

// ---------------------------------------------------------------------------
// SlateError — unified error type
// ---------------------------------------------------------------------------

/**
 * Unified error type for all Slate operations.
 *
 * Callers handle errors via exhaustive `switch` on `kind` — no need to
 * know whether an error came from PRD or task logic.
 */
export type SlateError =
	// -- PRD errors -----------------------------------------------------------
	| { kind: "prd-not-found"; id: string }
	| { kind: "prd-invalid-title"; message: string }
	| { kind: "prd-invalid-status"; status: string }
	| { kind: "prd-corrupted-file"; id: string; message: string }
	| { kind: "prd-already-exists"; id: string }
	| { kind: "prd-directory-invalid"; path: string; reason: string }

	// -- Task errors ----------------------------------------------------------
	| { kind: "task-not-found"; id: string }
	| { kind: "task-invalid-title"; message: string }
	| { kind: "task-invalid-status"; status: string }
	| { kind: "task-invalid-priority"; priority: string }
	| { kind: "task-corrupted-file"; id: string; message: string }
	| { kind: "task-already-exists"; id: string }
	| { kind: "task-already-done"; id: string }
	| { kind: "task-directory-invalid"; path: string; reason: string }

	// -- Store errors ---------------------------------------------------------
	| { kind: "store-not-found"; path: string }
	| { kind: "store-is-file"; path: string }
	| { kind: "store-not-writable"; path: string };

// ---------------------------------------------------------------------------
// ISlate interface
// ---------------------------------------------------------------------------

/**
 * Narrow interface for the Slate facade.
 *
 * Defines the public API contract that all Slate implementations must satisfy.
 * Callers depend on this interface, not on concrete classes.
 */
export interface ISlate {
	// -- PRD operations -------------------------------------------------------

	/**
	 * Create a new PRD.
	 *
	 * The PRD's `status` is computed from child task statuses at read time
	 * — it is not persisted in the frontmatter.
	 *
	 * @param params - The PRD creation parameters.
	 * @param params.title - The PRD title (must not be empty after trimming).
	 * @param params.priority - Optional priority level. Defaults to `"medium"`.
	 * @returns The created PRD on success, or a `SlateError` on failure.
	 */
	prdCreate(params: {
		title: string;
		priority?: "high" | "medium" | "low";
	}): Promise<Result<PRD, SlateError>>;

	/**
	 * Read a PRD by ID.
	 *
	 * @param id - The PRD ID to read.
	 * @returns The PRD entity on success, or a `SlateError` if not found or corrupted.
	 */
	prdRead(id: string): Promise<Result<PRD, SlateError>>;

	/**
	 * List all PRDs.
	 *
	 * @returns All PRD entities on success, or a `SlateError` if the store is invalid.
	 */
	prdList(): Promise<Result<PRD[], SlateError>>;

	// -- Task operations ------------------------------------------------------

	/**
	 * Create a new task.
	 *
	 * @param params - The task creation parameters.
	 * @param params.title - The task title (must not be empty after trimming).
	 * @param params.priority - Optional priority level. Defaults to `"medium"`.
	 * @param params.status - Optional status. Defaults to `"todo"`.
	 * @param params.dependencies - Optional dependency task IDs.
	 * @param params.prd - Optional parent PRD ID (validated against the store).
	 * @returns The created task on success, or a `SlateError` on failure.
	 */
	taskCreate(params: {
		title: string;
		priority?: "high" | "medium" | "low";
		status?: "todo" | "in-progress" | "done" | "blocked";
		dependencies?: string[];
		prd?: string;
	}): Promise<Result<Task, SlateError>>;

	/**
	 * Read a task by ID.
	 *
	 * @param id - The task ID to read.
	 * @returns The task entity on success, or a `SlateError` if not found or corrupted.
	 */
	taskRead(id: string): Promise<Result<Task, SlateError>>;

	/**
	 * List all tasks, optionally filtered.
	 *
	 * @param filter - Optional filter function applied to all tasks.
	 * @returns All matching task entities on success, or a `SlateError` if the store is invalid.
	 */
	taskList(filter?: TaskQueryFilter): Promise<Result<Task[], SlateError>>;

	/**
	 * Update a task's status, priority, and/or title.
	 *
	 * @param id - The task ID to update.
	 * @param updates - The fields to update.
	 * @param updates.status - Optional new status value.
	 * @param updates.priority - Optional new priority value.
	 * @param updates.title - Optional new title value.
	 * @returns Success on update, or a `SlateError` if the task is not found or values are invalid.
	 */
	taskUpdate(
		id: string,
		updates: {
			status?: "todo" | "in-progress" | "done" | "blocked";
			priority?: "high" | "medium" | "low";
			title?: string;
		},
	): Promise<Result<void, SlateError>>;

	/**
	 * Resolve (mark as done) a task by ID.
	 * Returns the list of dependent tasks that became unblocked.
	 *
	 * @param id - The task ID to resolve.
	 * @returns The resolve result with unblocked task IDs on success, or a `SlateError`.
	 */
	taskResolve(id: string): Promise<Result<ResolveResult, SlateError>>;

	/**
	 * Delete a task by ID.
	 *
	 * @param id - The task ID to delete.
	 * @returns Success on deletion, or a `SlateError` if the task is not found.
	 */
	taskDelete(id: string): Promise<Result<void, SlateError>>;
}
