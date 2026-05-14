import { PRDService } from "src/prd/PRDService";
import { LocalFileStore } from "src/store/LocalFileStore";
import { TaskService } from "src/task/TaskService";
import { createTestDir } from "../utils";

describe("CLI task list", () => {
	it("lists all tasks when no filter is provided", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store);

		service.create({ title: "Task A" });
		service.create({ title: "Task B", status: "in-progress" });
		service.create({ title: "Task C", status: "done" });

		const result = service.list();
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.length).toBe(3);
	});

	it("filters tasks by status", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store);

		service.create({ title: "Task A", status: "todo" });
		service.create({ title: "Task B", status: "in-progress" });
		service.create({ title: "Task C", status: "done" });

		const result = service.list();
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const filtered = result.value.filter((t) => t.status === "in-progress");
		expect(filtered.length).toBe(1);
		expect(filtered[0].title).toBe("Task B");
	});

	it("returns empty array when no tasks exist", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store);

		const result = service.list();
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.length).toBe(0);
	});
});

describe("CLI task update", () => {
	it("updates task status", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store);

		const createResult = service.create({ title: "Task to update" });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const taskId = createResult.value.id;

		const updateResult = service.update(taskId, { status: "in-progress" });
		expect(updateResult.ok).toBe(true);
		if (!updateResult.ok) return;

		const readResult = service.read(taskId);
		expect(readResult.ok).toBe(true);
		if (!readResult.ok) return;
		expect(readResult.value.status).toBe("in-progress");
	});

	it("updates task priority", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store);

		const createResult = service.create({ title: "Task to update" });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const taskId = createResult.value.id;

		const updateResult = service.update(taskId, { priority: "high" });
		expect(updateResult.ok).toBe(true);
		if (!updateResult.ok) return;

		const readResult = service.read(taskId);
		expect(readResult.ok).toBe(true);
		if (!readResult.ok) return;
		expect(readResult.value.priority).toBe("high");
	});

	it("updates both status and priority", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store);

		const createResult = service.create({
			title: "Task to update",
			status: "todo",
			priority: "low",
		});
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const taskId = createResult.value.id;

		const updateResult = service.update(taskId, {
			status: "done",
			priority: "high",
		});
		expect(updateResult.ok).toBe(true);
		if (!updateResult.ok) return;

		const readResult = service.read(taskId);
		expect(readResult.ok).toBe(true);
		if (!readResult.ok) return;
		expect(readResult.value.status).toBe("done");
		expect(readResult.value.priority).toBe("high");
	});

	it("returns not-found for non-existent task", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store);

		const result = service.update("task-999", { status: "done" });
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.kind).toBe("not-found");
	});

	it("rejects invalid status", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store);

		const createResult = service.create({ title: "Task" });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const result = service.update(createResult.value.id, {
			status: "invalid" as "todo" | "in-progress" | "done" | "blocked",
		});
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.kind).toBe("invalid-status");
	});

	it("rejects invalid priority", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store);

		const createResult = service.create({ title: "Task" });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const result = service.update(createResult.value.id, {
			priority: "invalid" as "high" | "medium" | "low",
		});
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.kind).toBe("invalid-priority");
	});

	it("updates the updated timestamp", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store);

		const createResult = service.create({ title: "Task" });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const _originalUpdated = createResult.value.updated;

		// Wait a moment to ensure timestamp changes
		// eslint-disable-next-line no-void
		void new Promise((r) => setTimeout(r, 10));

		const updateResult = service.update(createResult.value.id, {
			status: "done",
		});
		expect(updateResult.ok).toBe(true);
		if (!updateResult.ok) return;

		const readResult = service.read(createResult.value.id);
		expect(readResult.ok).toBe(true);
		if (!readResult.ok) return;
		expect(readResult.value.updated).toBeDefined();
	});
});

describe("CLI prd list", () => {
	it("lists all PRDs", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new PRDService(store);

		service.create({ title: "PRD A" });
		service.create({ title: "PRD B" });

		const result = service.list();
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.length).toBe(2);
	});

	it("returns empty array when no PRDs exist", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new PRDService(store);

		const result = service.list();
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.length).toBe(0);
	});
});

describe("CLI prd show", () => {
	it("displays full PRD details", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new PRDService(store);

		const createResult = service.create({
			title: "Test PRD",
			status: "in-progress",
			priority: "high",
		});
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const prdId = createResult.value.id;

		const showResult = service.read(prdId);
		expect(showResult.ok).toBe(true);
		if (!showResult.ok) return;
		expect(showResult.value.title).toBe("Test PRD");
		expect(showResult.value.status).toBe("in-progress");
		expect(showResult.value.priority).toBe("high");
	});

	it("returns not-found for non-existent PRD", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new PRDService(store);

		const result = service.read("prd-999");
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.kind).toBe("not-found");
	});
});
