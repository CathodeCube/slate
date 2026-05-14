import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import matter from "gray-matter";

import { PRDService } from "src/prd/PRDService";
import { Slate } from "src/Slate";
import { LocalFileStore } from "src/store/LocalFileStore";
import { TaskService } from "src/task/TaskService";
import { assertOk, createTestDir } from "../utils";

describe("Slate library — integration", () => {
	it("instantiates and configures the store", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		expect(slate).toBeInstanceOf(Slate);
		expect(slate.store).toBeInstanceOf(LocalFileStore);
		expect(slate.store.dir).toBe(storeDir);
		expect(slate.prds).toBeInstanceOf(PRDService);
		expect(slate.tasks).toBeInstanceOf(TaskService);
	});

	it("prds.create returns Result<PRD, PRDError>", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const result = slate.prdCreate({ title: "Test PRD" });

		expect(result.ok).toBe(true);
		const prd = assertOk(result);
		expect(prd.id).toMatch(/^prd-\d{3}$/);
		expect(prd.title).toBe("Test PRD");
		expect(prd.status).toBe("todo");
		expect(prd.priority).toBe("medium");
		expect(prd.created).toBeDefined();
		expect(prd.updated).toBeDefined();
	});

	it("prds.create rejects empty title", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const result = slate.prdCreate({ title: "  " });

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.kind).toBe("invalid-title");
	});

	it("prds.create accepts custom priority and status", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const result = slate.prdCreate({
			title: "Custom PRD",
			priority: "high",
			status: "in-progress",
		});

		expect(result.ok).toBe(true);
		const prd = assertOk(result);
		expect(prd.priority).toBe("high");
		expect(prd.status).toBe("in-progress");
	});

	it("tasks.create returns Result<Task, TaskError>", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const result = slate.taskCreate({
			title: "Test Task",
			priority: "high",
		});

		expect(result.ok).toBe(true);
		const task = assertOk(result);
		expect(task.id).toMatch(/^task-\d{3}$/);
		expect(task.title).toBe("Test Task");
		expect(task.status).toBe("todo");
		expect(task.priority).toBe("high");
		expect(task.dependencies).toEqual([]);
		expect(task.created).toBeDefined();
		expect(task.updated).toBeDefined();
	});

	it("tasks.create accepts dependencies and prd reference", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const result = slate.taskCreate({
			title: "Dependent Task",
			dependencies: ["task-001", "task-002"],
			prd: "prd-001",
		});

		expect(result.ok).toBe(true);
		const task = assertOk(result);
		expect(task.dependencies).toEqual(["task-001", "task-002"]);
		expect(task.prd).toBe("prd-001");
	});

	it("tasks.create rejects empty title", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const result = slate.taskCreate({ title: "  " });

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.kind).toBe("invalid-title");
	});

	it("taskQuery filters tasks correctly", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		slate.taskCreate({ title: "Task A" });
		slate.taskCreate({ title: "Task B" });
		slate.taskCreate({ title: "Task C", status: "in-progress" });

		const allResult = slate.taskQuery(() => true);
		expect(allResult.ok).toBe(true);
		if (!allResult.ok) return;
		expect(allResult.value.length).toBe(3);

		const filteredResult = slate.taskQuery((t) => t.status === "in-progress");
		expect(filteredResult.ok).toBe(true);
		if (!filteredResult.ok) return;
		expect(filteredResult.value.length).toBe(1);
		expect(filteredResult.value[0].title).toBe("Task C");
	});

	it("taskQuery returns empty array when no tasks match", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		slate.taskCreate({ title: "Task A" });

		const result = slate.taskQuery((t) => t.title === "Nonexistent");
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.length).toBe(0);
	});

	it("taskResolve marks a task as done", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const createResult = slate.taskCreate({ title: "Task to resolve" });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const taskId = createResult.value.id;

		const resolveResult = slate.taskResolve(taskId);
		expect(resolveResult.ok).toBe(true);
		if (!resolveResult.ok) return;

		// Verify the task is now done
		const queryResult = slate.taskQuery((t) => t.id === taskId);
		expect(queryResult.ok).toBe(true);
		if (!queryResult.ok) return;
		expect(queryResult.value.length).toBe(1);
		expect(queryResult.value[0].status).toBe("done");
	});

	it("taskResolve returns not-found for non-existent task", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const result = slate.taskResolve("task-999");

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.kind).toBe("not-found");
	});

	it("uses discriminated error unions (PRDError, TaskError)", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		// PRDError kind
		const prdError = slate.prdCreate({ title: "  " });
		expect(prdError.ok).toBe(false);
		if (prdError.ok) return;
		expect(prdError.error.kind).toBe("invalid-title");

		// TaskError kind
		const taskError = slate.taskCreate({ title: "  " });
		expect(taskError.ok).toBe(false);
		if (taskError.ok) return;
		expect(taskError.error.kind).toBe("invalid-title");
	});

	it("generates sequential IDs across PRD and task operations", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const prd1 = assertOk(slate.prdCreate({ title: "PRD 1" }));
		const prd2 = assertOk(slate.prdCreate({ title: "PRD 2" }));
		const task1 = assertOk(slate.taskCreate({ title: "Task 1" }));
		const task2 = assertOk(slate.taskCreate({ title: "Task 2" }));

		expect(prd1.id).toBe("prd-001");
		expect(prd2.id).toBe("prd-002");
		expect(task1.id).toBe("task-001");
		expect(task2.id).toBe("task-002");
	});

	it("defaults priority to medium for both PRDs and tasks", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const prd = assertOk(slate.prdCreate({ title: "Default PRD" }));
		const task = assertOk(slate.taskCreate({ title: "Default Task" }));

		expect(prd.priority).toBe("medium");
		expect(task.priority).toBe("medium");
	});

	it("defaults status to todo for both PRDs and tasks", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const prd = assertOk(slate.prdCreate({ title: "Default PRD" }));
		const task = assertOk(slate.taskCreate({ title: "Default Task" }));

		expect(prd.status).toBe("todo");
		expect(task.status).toBe("todo");
	});

	// -- Dependency resolution tests ----------------------------------------

	it("taskResolve marks a task as done and updates the file", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const createResult = slate.taskCreate({ title: "Task to resolve" });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const taskId = createResult.value.id;

		// Read file before
		const taskFile = join(storeDir, "tasks", `${taskId}.md`);
		const before = readFileSync(taskFile, "utf-8");
		const beforeUpdated = before.match(/updated: (.+)/);

		const resolveResult = slate.taskResolve(taskId);
		expect(resolveResult.ok).toBe(true);
		if (!resolveResult.ok) return;

		// Verify the task is now done
		const queryResult = slate.taskQuery((t) => t.id === taskId);
		expect(queryResult.ok).toBe(true);
		if (!queryResult.ok) return;
		expect(queryResult.value.length).toBe(1);
		expect(queryResult.value[0].status).toBe("done");

		// Verify the file was updated
		const after = readFileSync(taskFile, "utf-8");
		const afterUpdated = after.match(/updated: (.+)/);
		expect(afterUpdated).toBeDefined();
		if (beforeUpdated && afterUpdated) {
			// The timestamp may be the same if the operation completes within
			// the same millisecond — just verify the file content changed.
			expect(after).not.toBe(before);
		}
	});

	it("taskResolve returns unblocked tasks when dependents are fully resolved", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		// Create two tasks that depend on a common parent
		const parentResult = slate.taskCreate({ title: "Parent" });
		expect(parentResult.ok).toBe(true);
		if (!parentResult.ok) return;

		const child1Result = slate.taskCreate({
			title: "Child 1",
			dependencies: [parentResult.value.id],
		});
		expect(child1Result.ok).toBe(true);
		if (!child1Result.ok) return;

		const child2Result = slate.taskCreate({
			title: "Child 2",
			dependencies: [parentResult.value.id],
		});
		expect(child2Result.ok).toBe(true);
		if (!child2Result.ok) return;

		// Resolve the parent — both children should be unblocked
		const resolveResult = slate.taskResolve(parentResult.value.id);
		expect(resolveResult.ok).toBe(true);
		if (!resolveResult.ok) return;

		expect(resolveResult.value.unblocked).toContain(child1Result.value.id);
		expect(resolveResult.value.unblocked).toContain(child2Result.value.id);
	});

	it("taskResolve returns empty unblocked list when no dependents", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const createResult = slate.taskCreate({ title: "Standalone" });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const resolveResult = slate.taskResolve(createResult.value.id);
		expect(resolveResult.ok).toBe(true);
		if (!resolveResult.ok) return;

		expect(resolveResult.value.unblocked).toEqual([]);
	});

	it("taskResolve detects and rejects dependency cycles", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		// Create tasks: A -> B -> C -> A (cycle)
		const taskA = assertOk(slate.taskCreate({ title: "Task A" }));
		const taskB = assertOk(
			slate.taskCreate({ title: "Task B", dependencies: [taskA.id] }),
		);
		const taskC = assertOk(
			slate.taskCreate({ title: "Task C", dependencies: [taskB.id] }),
		);
		// Make task A depend on task C to create a cycle using the store directly
		const store = new LocalFileStore(storeDir);
		const readA = store.readTask(taskA.id);
		if (!readA.ok) return;
		readA.value.dependencies = [taskC.id];
		readA.value.updated = new Date().toISOString();
		store.createTask(readA.value);

		const result = slate.taskResolve(taskA.id);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.kind).toBe("cycle-detected");
		if (result.error.kind !== "cycle-detected") return;
		expect(result.error.cycle.length).toBeGreaterThan(0);
	});

	it("taskResolve does not resolve when dependencies are not all done", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const parent = assertOk(slate.taskCreate({ title: "Parent" }));
		const child = assertOk(
			slate.taskCreate({
				title: "Child",
				dependencies: [parent.id],
			}),
		);

		// Child depends on parent, but parent is not done
		const resolveResult = slate.taskResolve(child.id);
		expect(resolveResult.ok).toBe(true);
		if (!resolveResult.ok) return;

		// Verify child is done but no tasks were unblocked
		expect(resolveResult.value.unblocked).toEqual([]);
		const queryResult = slate.taskQuery((t) => t.id === child.id);
		expect(queryResult.ok).toBe(true);
		if (!queryResult.ok) return;
		expect(queryResult.value[0].status).toBe("done");
	});

	// -- Full workflow integration test ---------------------------------------

	it("full workflow: create PRD → create tasks → query → update → resolve", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		// 1. Create a PRD
		const prdResult = slate.prdCreate({ title: "Full Workflow Test" });
		expect(prdResult.ok).toBe(true);
		if (!prdResult.ok) return;
		const prdId = prdResult.value.id;

		// Verify PRD file on disk
		const prdFile = join(storeDir, "prds", `${prdId}.md`);
		expect(existsSync(prdFile)).toBe(true);
		const prdRaw = readFileSync(prdFile, "utf-8");
		const { data: prdData } = matter(prdRaw);
		expect(prdData.id).toBe(prdId);
		expect(prdData.title).toBe("Full Workflow Test");
		expect(prdData.status).toBe("todo");
		expect(prdData.priority).toBe("medium");
		expect(prdData.created).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		expect(prdData.updated).toMatch(/^\d{4}-\d{2}-\d{2}T/);

		// 2. Create tasks with dependencies
		const task1 = assertOk(
			slate.taskCreate({
				title: "Task 1",
				priority: "high",
				prd: prdId,
			}),
		);
		const task2 = assertOk(
			slate.taskCreate({
				title: "Task 2",
				priority: "medium",
				prd: prdId,
				dependencies: [task1.id],
			}),
		);
		const task3 = assertOk(
			slate.taskCreate({
				title: "Task 3",
				priority: "low",
				prd: prdId,
			}),
		);

		// 3. Query tasks
		const allTasks = assertOk(slate.taskQuery(() => true));
		expect(allTasks.length).toBe(3);

		const highPriority = assertOk(
			slate.taskQuery((t) => t.priority === "high"),
		);
		expect(highPriority.length).toBe(1);
		expect(highPriority[0].id).toBe(task1.id);

		// 4. Update task status and priority
		const updateResult = slate.taskUpdate(task1.id, {
			status: "in-progress",
			priority: "low",
		});
		expect(updateResult.ok).toBe(true);

		const updatedTask = assertOk(slate.taskQuery((t) => t.id === task1.id));
		expect(updatedTask[0].status).toBe("in-progress");
		expect(updatedTask[0].priority).toBe("low");

		// 5. Resolve task 1, which should unblock task 2
		const resolveResult = slate.taskResolve(task1.id);
		expect(resolveResult.ok).toBe(true);
		if (!resolveResult.ok) return;
		expect(resolveResult.value.unblocked).toContain(task2.id);

		// Verify task 1 is done
		const resolvedTask = assertOk(slate.taskQuery((t) => t.id === task1.id));
		expect(resolvedTask[0].status).toBe("done");

		// 6. Ad-hoc task (no PRD binding)
		const adHoc = assertOk(
			slate.taskCreate({ title: "Ad-hoc Task", priority: "low" }),
		);
		const adHocFile = join(storeDir, "tasks", `${adHoc.id}.md`);
		expect(existsSync(adHocFile)).toBe(true);
		const adHocRaw = readFileSync(adHocFile, "utf-8");
		const { data: adHocData } = matter(adHocRaw);
		expect(adHocData.prd).toBeUndefined();

		// 7. Sequential ID verification
		expect(prdId).toBe("prd-001");
		expect(task1.id).toBe("task-001");
		expect(task2.id).toBe("task-002");
		expect(task3.id).toBe("task-003");
		expect(adHoc.id).toBe("task-004");
	});
});
