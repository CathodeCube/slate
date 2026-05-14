import type { PRD, PRDError, Task, TaskError } from "src/prd/types";
import type { Result } from "src/utils/result";

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

/**
 * Single store interface that handles both PRD and task operations.
 * A single implementation (`LocalFileStore`) provides concrete file-based storage.
 */
export interface IStore {
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
}
