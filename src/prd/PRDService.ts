/**
 * Service layer for PRD operations.
 *
 * Encapsulates business logic such as ID generation, default values, and
 * validation. Depends on `IStore` via constructor injection.
 */
import type { PRD, PRDError, PRDStatus, Priority } from "src/prd/types";
import type { IStore } from "src/store/IStore";
import type { Result } from "src/utils/result";

// ---------------------------------------------------------------------------
// PRDService
// ---------------------------------------------------------------------------

/**
 * Service layer for PRD operations.
 *
 * Encapsulates business logic such as ID generation, default values, and
 * validation. Depends on `IStore` via constructor injection.
 */
export class PRDService {
	/**
	 * Create a new PRDService backed by the given store.
	 *
	 * @param store - The store implementation used for PRD persistence.
	 */
	constructor(private store: IStore) {}

	/**
	 * Read a PRD by ID.
	 *
	 * @param id - The PRD ID to read.
	 * @returns The PRD entity on success, or an error if the PRD is not found or corrupted.
	 */
	read(id: string): Result<PRD, PRDError> {
		return this.store.readPRD(id);
	}

	/**
	 * List all PRDs from the store.
	 *
	 * @returns All PRD entities on success, or an error if the store directory is invalid.
	 */
	list(): Result<PRD[], PRDError> {
		return this.store.listPRDs();
	}

	/**
	 * Create a new PRD with default values.
	 *
	 * @param params - The PRD creation parameters.
	 * @param params.title - The PRD title (must not be empty after trimming).
	 * @param params.priority - Optional priority level. Defaults to `"medium"`.
	 * @param params.status - Optional status. Defaults to `"todo"`.
	 * @returns The created PRD on success, or an error if validation fails or the store write fails.
	 */
	create(params: {
		title: string;
		priority?: Priority;
		status?: PRDStatus;
	}): Result<PRD, PRDError> {
		const title = params.title.trim();
		if (!title) {
			return {
				ok: false,
				error: { kind: "invalid-title", message: "Title must not be empty" },
			};
		}

		const now = new Date().toISOString();
		const status = params.status ?? "todo";
		const priority = params.priority ?? "medium";

		const prd: PRD = {
			id: this.store.nextPRDID(),
			title,
			status,
			priority,
			created: now,
			updated: now,
		};

		const result = this.store.createPRD(prd);
		if (!result.ok) {
			return result;
		}

		return { ok: true, value: prd };
	}
}
