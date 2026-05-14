import type { PRD, PRDError, PRDStatus, Priority } from "src/prd/types";
import type { IStore } from "src/store/IStore";
import type { Result } from "src/utils/result";

// ---------------------------------------------------------------------------
// PRDService
// ---------------------------------------------------------------------------

/**
 * Service layer for PRD operations. Encapsulates business logic such as
 * ID generation, default values, and validation.
 */
export class PRDService {
	constructor(private store: IStore) {}

	/**
	 * Create a new PRD with default values.
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
			id: this.store.nextPRDId(),
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
