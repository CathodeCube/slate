import type { PRD, PrdError } from "src/prd/types";
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
	prdCreate(prd: PRD): Result<void, PrdError>;

	/**
	 * Read a PRD file from the store.
	 */
	prdRead(id: string): Result<PRD, PrdError>;

	/**
	 * Read all PRD files from the store.
	 */
	prdList(): Result<PRD[], PrdError>;

	/**
	 * Directory path where the store lives.
	 */
	get dir(): string;

	/**
	 * Generate the next sequential PRD ID.
	 */
	nextPrdId(): string;
}
