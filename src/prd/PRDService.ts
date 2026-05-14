/**
 * Service layer for PRD operations.
 *
 * Encapsulates business logic such as ID generation, default values, and
 * validation. Depends on `IStore` via constructor injection.
 */
import type { PRD, PRDError, PRDStatus, Priority } from "src/prd/types";
import type { IStore } from "src/store/IStore";
import type { Task, TaskQueryFilter } from "src/task/types";
import type { Result } from "src/utils/result";

// ---------------------------------------------------------------------------
// PRD status computation
// ---------------------------------------------------------------------------

/**
 * Compute a PRD's status from its child task statuses.
 *
 * Derivation rules:
 * - "done" if all children are done (and at least one child exists)
 * - "in-progress" if any child is in-progress
 * - "todo" otherwise (no children, or all children are todo/blocked)
 */
function computePRDStatus(tasks: Task[]): PRDStatus {
	if (tasks.length === 0) {
		return "todo";
	}

	const allDone = tasks.every((t) => t.status === "done");
	if (allDone) {
		return "done";
	}

	const anyInProgress = tasks.some((t) => t.status === "in-progress");
	if (anyInProgress) {
		return "in-progress";
	}

	return "todo";
}

/**
 * Get all tasks belonging to a given PRD.
 */
function getTasksForPRD(
	allTasks: Task[],
	predicate: TaskQueryFilter,
	parentId: string,
): Task[] {
	return allTasks.filter((t) => t.prd === parentId && predicate(t));
}

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
	 * The PRD's `status` field is computed from child task statuses at read
	 * time — it is not persisted in the frontmatter.
	 *
	 * @param id - The PRD ID to read.
	 * @returns The PRD entity on success, or an error if the PRD is not found or corrupted.
	 */
	read(id: string): Result<PRD, PRDError> {
		const result = this.store.readPRD(id);
		if (!result.ok) {
			return result;
		}

		const prd = result.value;
		const tasksResult = this.store.listTasks();
		const status: PRDStatus = tasksResult.ok
			? computePRDStatus(getTasksForPRD(tasksResult.value, () => true, id))
			: "todo";

		return { ok: true, value: { ...prd, status } };
	}

	/**
	 * List all PRDs from the store.
	 *
	 * Each PRD's `status` field is computed from child task statuses at read
	 * time — it is not persisted in the frontmatter.
	 *
	 * @returns All PRD entities on success, or an error if the store directory is invalid.
	 */
	list(): Result<PRD[], PRDError> {
		const prdResult = this.store.listPRDs();
		if (!prdResult.ok) {
			return prdResult;
		}

		const tasksResult = this.store.listTasks();
		const allTasks = tasksResult.ok ? tasksResult.value : [];

		const prds = prdResult.value.map((prd) => {
			const status: PRDStatus = computePRDStatus(
				getTasksForPRD(allTasks, () => true, prd.id),
			);
			return { ...prd, status };
		});

		return { ok: true, value: prds };
	}

	/**
	 * Create a new PRD with default values.
	 *
	 * The PRD's `status` is computed from child task statuses at read time.
	 * The `status` parameter is no longer accepted — status is derived,
	 * not set.
	 *
	 * @param params - The PRD creation parameters.
	 * @param params.title - The PRD title (must not be empty after trimming).
	 * @param params.priority - Optional priority level. Defaults to `"medium"`.
	 * @returns The created PRD on success, or an error if validation fails or the store write fails.
	 */
	create(params: {
		title: string;
		priority?: Priority;
	}): Result<PRD, PRDError> {
		const title = params.title.trim();
		if (!title) {
			return {
				ok: false,
				error: { kind: "invalid-title", message: "Title must not be empty" },
			};
		}

		const now = new Date().toISOString();
		const priority = params.priority ?? "medium";

		const prd: PRD = {
			id: this.store.nextPRDID(),
			title,
			status: "todo",
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
