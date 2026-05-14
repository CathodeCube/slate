/**
 * Single store interface that handles both PRD and task operations.
 *
 * A single implementation (`LocalFileStore`) provides concrete file-based storage.
 * The interface gives us testability and a swap point if we ever need a different
 * storage backend.
 */
import type { PRD, PRDError } from "src/prd/types";
import type { Task, TaskError } from "src/task/types";
import type { Result } from "src/utils/result";

// ---------------------------------------------------------------------------
// Store construction error
// ---------------------------------------------------------------------------

/**
 * Error returned when the store directory cannot be initialized.
 */
export type StoreInitError =
	| { kind: "not-found"; path: string }
	| { kind: "is-file"; path: string }
	| { kind: "not-writable"; path: string };

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

/**
 * Single store interface that handles both PRD and task operations.
 * A single implementation (`LocalFileStore`) provides concrete file-based storage.
 */
export interface IStore {
	/**
	 * Check if a PRD file exists.
	 */
	existsPRD(id: string): boolean;

	/**
	 * Create a PRD file in the store.
	 */
	createPRD(prd: PRD): Result<void, PRDError>;

	/**
	 * Read a PRD file from the store.
	 */
	readPRD(id: string): Result<PRD, PRDError>;

	/**
	 * Read all PRD files from the store.
	 */
	listPRDs(): Result<PRD[], PRDError>;

	/**
	 * Directory path where the store lives.
	 */
	get dir(): string;

	/**
	 * Generate the next sequential PRD ID.
	 */
	nextPRDID(): string;

	// -- Task operations ------------------------------------------------------

	/**
	 * Create a task file in the store.
	 */
	createTask(task: Task): Result<void, TaskError>;

	/**
	 * Update an existing task file in the store (overwrites without checking).
	 */
	updateTask(task: Task): Result<void, TaskError>;

	/**
	 * Read a task file from the store.
	 */
	readTask(id: string): Result<Task, TaskError>;

	/**
	 * Read all task files from the store.
	 */
	listTasks(): Result<Task[], TaskError>;

	/**
	 * Generate the next sequential task ID.
	 */
	nextTaskID(): string;

	/**
	 * Delete a task file from the store.
	 */
	deleteTask(id: string): Result<void, TaskError>;
}
