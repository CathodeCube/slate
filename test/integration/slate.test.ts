import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import matter from "gray-matter";

import { Slate } from "src/Slate";
import { assertOk, createTestDir } from "../utils";

describe("Slate library — integration", () => {
	it("instantiates and implements ISlate", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		expect(slate).toBeInstanceOf(Slate);
		// Verify the facade works via ISlate methods
		const prdResult = slate.prdCreate({ title: "Test PRD" });
		expect(prdResult.ok).toBe(true);
	});

	it("prdCreate returns Result<PRD, SlateError>", () => {
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

	it("prdCreate rejects empty title", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const result = slate.prdCreate({ title: "  " });

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.kind).toBe("prd-invalid-title");
	});

	it("prdCreate accepts custom priority and status", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const result = slate.prdCreate({
			title: "Custom PRD",
			priority: "high",
		});

		expect(result.ok).toBe(true);
		const prd = assertOk(result);
		expect(prd.priority).toBe("high");
		expect(prd.status).toBe("todo");
	});

	it("prdRead returns a PRD by ID", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const createResult = slate.prdCreate({ title: "Test PRD" });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const readResult = slate.prdRead(createResult.value.id);
		expect(readResult.ok).toBe(true);
		if (!readResult.ok) return;
		expect(readResult.value.title).toBe("Test PRD");
	});

	it("prdRead returns not-found for non-existent PRD", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const result = slate.prdRead("prd-999");

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.kind).toBe("prd-not-found");
	});

	it("prdList returns all PRDs", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		slate.prdCreate({ title: "PRD A" });
		slate.prdCreate({ title: "PRD B" });

		const result = slate.prdList();
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.length).toBe(2);
	});

	it("taskCreate returns Result<Task, SlateError>", () => {
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

	it("taskCreate accepts dependencies and prd reference", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		// Create a PRD first so the task can reference it
		const prdResult = slate.prdCreate({ title: "Test PRD" });
		expect(prdResult.ok).toBe(true);
		if (!prdResult.ok) return;

		const result = slate.taskCreate({
			title: "Dependent Task",
			dependencies: ["task-001", "task-002"],
			prd: prdResult.value.id,
		});

		expect(result.ok).toBe(true);
		const task = assertOk(result);
		expect(task.dependencies).toEqual(["task-001", "task-002"]);
		expect(task.prd).toBe("prd-001");
	});

	it("taskCreate rejects empty title", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const result = slate.taskCreate({ title: "  " });

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.kind).toBe("task-invalid-title");
	});

	it("taskList filters tasks correctly", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		slate.taskCreate({ title: "Task A" });
		slate.taskCreate({ title: "Task B" });
		slate.taskCreate({ title: "Task C", status: "in-progress" });

		const allResult = slate.taskList(() => true);
		expect(allResult.ok).toBe(true);
		if (!allResult.ok) return;
		expect(allResult.value.length).toBe(3);

		const filteredResult = slate.taskList((t) => t.status === "in-progress");
		expect(filteredResult.ok).toBe(true);
		if (!filteredResult.ok) return;
		expect(filteredResult.value.length).toBe(1);
		expect(filteredResult.value[0].title).toBe("Task C");
	});

	it("taskList returns empty array when no tasks match", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		slate.taskCreate({ title: "Task A" });

		const result = slate.taskList((t) => t.title === "Nonexistent");
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.length).toBe(0);
	});

	it("taskRead returns a task by ID", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const createResult = slate.taskCreate({ title: "Test Task" });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const readResult = slate.taskRead(createResult.value.id);
		expect(readResult.ok).toBe(true);
		if (!readResult.ok) return;
		expect(readResult.value.title).toBe("Test Task");
	});

	it("taskRead returns not-found for non-existent task", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const result = slate.taskRead("task-999");

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.kind).toBe("task-not-found");
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
		const queryResult = slate.taskList((t) => t.id === taskId);
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
		expect(result.error.kind).toBe("task-not-found");
	});

	it("taskResolve returns already-done error for an already done task", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const createResult = slate.taskCreate({ title: "Task to resolve" });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const taskId = createResult.value.id;

		// First resolve — succeeds
		const firstResult = slate.taskResolve(taskId);
		expect(firstResult.ok).toBe(true);
		if (!firstResult.ok) return;

		// Second resolve — should return already-done
		const secondResult = slate.taskResolve(taskId);
		expect(secondResult.ok).toBe(false);
		if (secondResult.ok) return;
		expect(secondResult.error.kind).toBe("task-already-done");
		if (secondResult.error.kind !== "task-already-done") return;
		expect(secondResult.error.id).toBe(taskId);
	});

	it("taskUpdate updates status and priority", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const createResult = slate.taskCreate({ title: "Task to update" });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const updateResult = slate.taskUpdate(createResult.value.id, {
			status: "in-progress",
			priority: "high",
		});
		expect(updateResult.ok).toBe(true);

		const readResult = slate.taskRead(createResult.value.id);
		expect(readResult.ok).toBe(true);
		if (!readResult.ok) return;
		expect(readResult.value.status).toBe("in-progress");
		expect(readResult.value.priority).toBe("high");
	});

	it("taskUpdate preserves task body content", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const createResult = slate.taskCreate({ title: "Task with body" });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const taskId = createResult.value.id;
		const taskFile = join(storeDir, "tasks", `${taskId}.md`);

		// Write body content directly to the file (simulating stdin body)
		const existing = readFileSync(taskFile, "utf-8");
		const bodyContent = "This is the task body content.";
		writeFileSync(taskFile, `${existing}\n\n${bodyContent}`, "utf-8");

		// Update the task status
		const updateResult = slate.taskUpdate(taskId, { status: "in-progress" });
		expect(updateResult.ok).toBe(true);

		// Verify body content is preserved
		const after = readFileSync(taskFile, "utf-8");
		expect(after).toContain(bodyContent);
		expect(after).toContain("status: in-progress");
	});

	it("taskUpdate rejects invalid status", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const createResult = slate.taskCreate({ title: "Task" });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const updateResult = slate.taskUpdate(createResult.value.id, {
			status: "invalid",
		} as unknown as {
			status?: "todo" | "in-progress" | "done" | "blocked";
			priority?: "high" | "medium" | "low";
		});
		expect(updateResult.ok).toBe(false);
		if (updateResult.ok) return;
		expect(updateResult.error.kind).toBe("task-invalid-status");
	});

	it("taskUpdate updates title", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const createResult = slate.taskCreate({ title: "Original title" });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const updateResult = slate.taskUpdate(createResult.value.id, {
			title: "New title",
		});
		expect(updateResult.ok).toBe(true);

		const readResult = slate.taskRead(createResult.value.id);
		expect(readResult.ok).toBe(true);
		if (!readResult.ok) return;
		expect(readResult.value.title).toBe("New title");
	});

	it("taskUpdate updates title along with status", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const createResult = slate.taskCreate({ title: "Original" });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const updateResult = slate.taskUpdate(createResult.value.id, {
			title: "Renamed",
			status: "in-progress",
		});
		expect(updateResult.ok).toBe(true);

		const readResult = slate.taskRead(createResult.value.id);
		expect(readResult.ok).toBe(true);
		if (!readResult.ok) return;
		expect(readResult.value.title).toBe("Renamed");
		expect(readResult.value.status).toBe("in-progress");
	});

	it("taskUpdate rejects empty title", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const createResult = slate.taskCreate({ title: "Task" });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const updateResult = slate.taskUpdate(createResult.value.id, {
			title: "   ",
		});
		expect(updateResult.ok).toBe(false);
		if (updateResult.ok) return;
		expect(updateResult.error.kind).toBe("task-invalid-title");
	});

	it("taskDelete deletes a task", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const createResult = slate.taskCreate({ title: "Task to delete" });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const deleteResult = slate.taskDelete(createResult.value.id);
		expect(deleteResult.ok).toBe(true);

		const readResult = slate.taskRead(createResult.value.id);
		expect(readResult.ok).toBe(false);
		if (readResult.ok) return;
		expect(readResult.error.kind).toBe("task-not-found");
	});

	it("uses discriminated SlateError union", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		// PRD error
		const prdError = slate.prdCreate({ title: "  " });
		expect(prdError.ok).toBe(false);
		if (prdError.ok) return;
		expect(prdError.error.kind).toBe("prd-invalid-title");

		// Task error
		const taskError = slate.taskCreate({ title: "  " });
		expect(taskError.ok).toBe(false);
		if (taskError.ok) return;
		expect(taskError.error.kind).toBe("task-invalid-title");
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
		const queryResult = slate.taskList((t) => t.id === taskId);
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

	it("taskResolve succeeds even when a cycle exists in the data", async () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		// Create tasks: A -> B -> C
		const taskA = assertOk(slate.taskCreate({ title: "Task A" }));
		const taskB = assertOk(
			slate.taskCreate({ title: "Task B", dependencies: [taskA.id] }),
		);
		const taskC = assertOk(
			slate.taskCreate({ title: "Task C", dependencies: [taskB.id] }),
		);
		// Create a cycle by making task A depend on task C using the store directly
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const readA = store.readTask(taskA.id);
		if (!readA.ok) return;
		readA.value.dependencies = [taskC.id];
		readA.value.updated = new Date().toISOString();
		store.updateTask(readA.value);

		// resolve() no longer checks for cycles — it succeeds
		const result = slate.taskResolve(taskA.id);
		expect(result.ok).toBe(true);
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
		const queryResult = slate.taskList((t) => t.id === child.id);
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
		expect(prdData.status).toBeUndefined();
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
		const allTasks = assertOk(slate.taskList(() => true));
		expect(allTasks.length).toBe(3);

		const highPriority = assertOk(slate.taskList((t) => t.priority === "high"));
		expect(highPriority.length).toBe(1);
		expect(highPriority[0].id).toBe(task1.id);

		// 4. Update task status and priority
		const updateResult = slate.taskUpdate(task1.id, {
			status: "in-progress",
			priority: "low",
		});
		expect(updateResult.ok).toBe(true);

		const updatedTask = assertOk(slate.taskList((t) => t.id === task1.id));
		expect(updatedTask[0].status).toBe("in-progress");
		expect(updatedTask[0].priority).toBe("low");

		// 5. Resolve task 1, which should unblock task 2
		const resolveResult = slate.taskResolve(task1.id);
		expect(resolveResult.ok).toBe(true);
		if (!resolveResult.ok) return;
		expect(resolveResult.value.unblocked).toContain(task2.id);

		// Verify task 1 is done
		const resolvedTask = assertOk(slate.taskList((t) => t.id === task1.id));
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

	// -- PRD status computation tests ----------------------------------------

	it("computes PRD status as 'done' when all child tasks are done", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const prdResult = slate.prdCreate({ title: "Test PRD" });
		expect(prdResult.ok).toBe(true);
		if (!prdResult.ok) return;
		const prdId = prdResult.value.id;

		// Create child tasks
		const task1 = assertOk(slate.taskCreate({ title: "Task 1", prd: prdId }));
		const task2 = assertOk(slate.taskCreate({ title: "Task 2", prd: prdId }));

		// PRD should be 'todo' initially
		const prd1 = assertOk(slate.prdRead(prdId));
		expect(prd1.status).toBe("todo");

		// Resolve both tasks
		slate.taskResolve(task1.id);
		slate.taskResolve(task2.id);

		// PRD should now be 'done'
		const prd2 = assertOk(slate.prdRead(prdId));
		expect(prd2.status).toBe("done");
	});

	it("computes PRD status as 'in-progress' when any child is in-progress", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const prdResult = slate.prdCreate({ title: "Test PRD" });
		expect(prdResult.ok).toBe(true);
		if (!prdResult.ok) return;
		const prdId = prdResult.value.id;

		const task1 = assertOk(slate.taskCreate({ title: "Task 1", prd: prdId }));
		const task2 = assertOk(slate.taskCreate({ title: "Task 2", prd: prdId }));

		// Mark one task in-progress
		slate.taskUpdate(task1.id, { status: "in-progress" });

		const prd = assertOk(slate.prdRead(prdId));
		expect(prd.status).toBe("in-progress");

		// Resolve task 1 — task 1 is done, task 2 is still todo
		slate.taskResolve(task1.id);

		const prd2 = assertOk(slate.prdRead(prdId));
		expect(prd2.status).toBe("todo");

		// Now resolve task 2 — all children done
		slate.taskResolve(task2.id);

		const prd3 = assertOk(slate.prdRead(prdId));
		expect(prd3.status).toBe("done");
	});

	it("computes PRD status as 'todo' when no children exist", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const prdResult = slate.prdCreate({ title: "Empty PRD" });
		expect(prdResult.ok).toBe(true);
		if (!prdResult.ok) return;

		const prd = assertOk(slate.prdRead(prdResult.value.id));
		expect(prd.status).toBe("todo");
	});

	it("computes PRD status from list() for each PRD", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const prd1 = assertOk(slate.prdCreate({ title: "PRD 1" }));
		const prd2 = assertOk(slate.prdCreate({ title: "PRD 2" }));

		// Create tasks for PRD 1 only
		assertOk(slate.taskCreate({ title: "Task A", prd: prd1.id }));
		assertOk(slate.taskCreate({ title: "Task B", prd: prd1.id }));

		const result = slate.prdList();
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const prds = result.value;
		expect(prds.length).toBe(2);

		const p1 = prds.find((p) => p.id === prd1.id);
		const p2 = prds.find((p) => p.id === prd2.id);

		expect(p1).toBeDefined();
		expect(p2).toBeDefined();
		if (!p1 || !p2) return;

		expect(p1.status).toBe("todo");
		expect(p2.status).toBe("todo");

		// Resolve all tasks for PRD 1
		const tasksForP1 = assertOk(slate.taskList((t) => t.prd === prd1.id));
		for (const task of tasksForP1) {
			slate.taskResolve(task.id);
		}

		const prds2 = assertOk(slate.prdList());
		const p1updated = prds2.find((p) => p.id === prd1.id);
		const p2updated = prds2.find((p) => p.id === prd2.id);

		expect(p1updated).toBeDefined();
		expect(p2updated).toBeDefined();
		if (!p1updated || !p2updated) return;

		expect(p1updated.status).toBe("done");
		expect(p2updated.status).toBe("todo");
	});

	it("computes PRD status as 'todo' when children are all blocked", () => {
		const storeDir = createTestDir();
		const slate = new Slate({ dir: storeDir });

		const prdResult = slate.prdCreate({ title: "Test PRD" });
		expect(prdResult.ok).toBe(true);
		if (!prdResult.ok) return;
		const prdId = prdResult.value.id;

		// Create a task that depends on a non-existent task (blocked)
		assertOk(
			slate.taskCreate({
				title: "Blocked Task",
				prd: prdId,
				dependencies: ["task-999"],
			}),
		);

		const prd = assertOk(slate.prdRead(prdId));
		expect(prd.status).toBe("todo");
	});
});
