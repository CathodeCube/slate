import { buildDependencyIndex } from "src/task/DependencyIndex";
import type { Task } from "src/task/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(
	overrides: Partial<Task> & { id: string; dependencies: string[] },
): Task {
	const now = new Date().toISOString();
	return {
		id: overrides.id,
		title: overrides.title ?? "Task",
		status: overrides.status ?? "todo",
		priority: overrides.priority ?? "medium",
		dependencies: overrides.dependencies,
		...(overrides.prd !== undefined && { prd: overrides.prd }),
		created: overrides.created ?? now,
		updated: overrides.updated ?? now,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DependencyIndex", () => {
	describe("build", () => {
		it("returns an index with empty dependents for a single task", () => {
			const tasks = [makeTask({ id: "task-001", dependencies: [] })];
			const index = buildDependencyIndex(tasks);

			expect(index.getDependents("task-001")).toEqual([]);
		});

		it("maps each task as dependent of its dependencies", () => {
			const tasks = [
				makeTask({ id: "task-001", dependencies: [] }),
				makeTask({ id: "task-002", dependencies: ["task-001"] }),
				makeTask({ id: "task-003", dependencies: ["task-001"] }),
			];
			const index = buildDependencyIndex(tasks);

			expect(index.getDependents("task-001")).toEqual(["task-002", "task-003"]);
			expect(index.getDependents("task-002")).toEqual([]);
			expect(index.getDependents("task-003")).toEqual([]);
		});

		it("handles tasks with multiple dependencies", () => {
			const tasks = [
				makeTask({ id: "task-001", dependencies: [] }),
				makeTask({ id: "task-002", dependencies: [] }),
				makeTask({ id: "task-003", dependencies: ["task-001", "task-002"] }),
			];
			const index = buildDependencyIndex(tasks);

			expect(index.getDependents("task-001")).toContain("task-003");
			expect(index.getDependents("task-002")).toContain("task-003");
		});

		it("handles empty task list", () => {
			const index = buildDependencyIndex([]);
			expect(index.getDependents("task-999")).toEqual([]);
		});

		it("handles missing dependencies gracefully", () => {
			const tasks = [
				makeTask({ id: "task-001", dependencies: [] }),
				makeTask({ id: "task-002", dependencies: ["task-999"] }),
			];
			const index = buildDependencyIndex(tasks);

			// task-999 is referenced as a dependency but doesn't exist as a task —
			// getDependents still returns who references it (task-002 depends on task-999)
			expect(index.getDependents("task-999")).toEqual(["task-002"]);
			expect(index.getDependents("task-001")).toEqual([]);
		});
	});

	describe("isDone", () => {
		it("returns true for a task with status 'done'", () => {
			const tasks = [
				makeTask({
					id: "task-001",
					dependencies: [],
					status: "done",
				}),
			];
			const index = buildDependencyIndex(tasks);
			expect(index.isDone("task-001")).toBe(true);
		});

		it("returns false for a task with status 'todo'", () => {
			const tasks = [
				makeTask({
					id: "task-001",
					dependencies: [],
					status: "todo",
				}),
			];
			const index = buildDependencyIndex(tasks);
			expect(index.isDone("task-001")).toBe(false);
		});

		it("returns false for a non-existent task", () => {
			const index = buildDependencyIndex([]);
			expect(index.isDone("task-999")).toBe(false);
		});

		it("returns false for 'in-progress' status", () => {
			const tasks = [
				makeTask({
					id: "task-001",
					dependencies: [],
					status: "in-progress",
				}),
			];
			const index = buildDependencyIndex(tasks);
			expect(index.isDone("task-001")).toBe(false);
		});

		it("returns false for 'blocked' status", () => {
			const tasks = [
				makeTask({
					id: "task-001",
					dependencies: [],
					status: "blocked",
				}),
			];
			const index = buildDependencyIndex(tasks);
			expect(index.isDone("task-001")).toBe(false);
		});
	});

	describe("getDependents", () => {
		it("returns dependents for a task with no dependents", () => {
			const tasks = [makeTask({ id: "task-001", dependencies: [] })];
			const index = buildDependencyIndex(tasks);
			expect(index.getDependents("task-001")).toEqual([]);
		});

		it("returns empty array for a non-existent task", () => {
			const index = buildDependencyIndex([]);
			expect(index.getDependents("task-999")).toEqual([]);
		});

		it("returns dependents in insertion order", () => {
			const tasks = [
				makeTask({ id: "task-001", dependencies: [] }),
				makeTask({ id: "task-002", dependencies: ["task-001"] }),
				makeTask({ id: "task-003", dependencies: ["task-001"] }),
				makeTask({ id: "task-004", dependencies: ["task-001"] }),
			];
			const index = buildDependencyIndex(tasks);
			expect(index.getDependents("task-001")).toEqual([
				"task-002",
				"task-003",
				"task-004",
			]);
		});
	});

	describe("transitive dependents", () => {
		it("returns direct dependents only", () => {
			const tasks = [
				makeTask({ id: "task-001", dependencies: [] }),
				makeTask({ id: "task-002", dependencies: ["task-001"] }),
				makeTask({ id: "task-003", dependencies: ["task-002"] }),
			];
			const index = buildDependencyIndex(tasks);

			// Only task-002 is a *direct* dependent of task-001
			expect(index.getDependents("task-001")).toEqual(["task-002"]);
			expect(index.getDependents("task-002")).toEqual(["task-003"]);
		});

		it("supports transitive traversal via getDependents", () => {
			const tasks = [
				makeTask({ id: "task-001", dependencies: [] }),
				makeTask({ id: "task-002", dependencies: ["task-001"] }),
				makeTask({ id: "task-003", dependencies: ["task-002"] }),
			];
			const index = buildDependencyIndex(tasks);

			const direct = index.getDependents("task-001");
			expect(direct).toContain("task-002");

			const transitive = index.getDependents("task-002");
			expect(transitive).toContain("task-003");
		});
	});
});
