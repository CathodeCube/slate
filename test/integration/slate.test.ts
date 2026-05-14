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
});
