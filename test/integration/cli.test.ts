import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { assertOk, createEmptyIndex, createTestDir, runSlate } from "../utils";

// ---------------------------------------------------------------------------
// CLI task list
// ---------------------------------------------------------------------------

describe("CLI task list", () => {
	it("lists all tasks with their metadata", async () => {
		const storeDir = createTestDir();

		// Create tasks via library
		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		service.create({ title: "Task A" });
		service.create({ title: "Task B", status: "in-progress" });
		service.create({ title: "Task C", status: "done" });

		const { stdout } = runSlate(["task", "list", "--dir", storeDir]);

		expect(stdout).toContain("task-001");
		expect(stdout).toContain("Task A");
		expect(stdout).toContain("task-002");
		expect(stdout).toContain("Task B");
		expect(stdout).toContain("task-003");
		expect(stdout).toContain("Task C");
	});

	it("filters tasks by status", async () => {
		const storeDir = createTestDir();

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		service.create({ title: "Task A", status: "todo" });
		service.create({ title: "Task B", status: "in-progress" });
		service.create({ title: "Task C", status: "done" });

		const { stdout } = runSlate([
			"task",
			"list",
			"--status",
			"in-progress",
			"--dir",
			storeDir,
		]);

		expect(stdout).toContain("Task B");
		expect(stdout).not.toContain("Task A");
		expect(stdout).not.toContain("Task C");
	});

	it("prints 'No tasks found.' when no tasks exist", async () => {
		const storeDir = createTestDir();
		const { stdout } = runSlate(["task", "list", "--dir", storeDir]);
		expect(stdout).toContain("No tasks found.");
	});
});

// ---------------------------------------------------------------------------
// CLI task update
// ---------------------------------------------------------------------------

describe("CLI task update", () => {
	it("updates task status and writes the change to disk", async () => {
		const storeDir = createTestDir();

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		const createResult = service.create({ title: "Task to update" });
		expect(createResult.ok).toBe(true);
		const taskId = createResult.ok ? createResult.value.id : "";

		const { stdout, exitCode } = runSlate([
			"task",
			"update",
			taskId,
			"--status",
			"in-progress",
			"--dir",
			storeDir,
		]);

		expect(exitCode).toBe(0);
		expect(stdout).toContain(`Updated task: ${taskId}`);

		// Verify file on disk was actually updated
		const filePath = join(storeDir, "tasks", `${taskId}.md`);
		expect(existsSync(filePath)).toBe(true);
		const content = readFileSync(filePath, "utf-8");
		expect(content).toContain("in-progress");
	});

	it("updates task priority and writes the change to disk", async () => {
		const storeDir = createTestDir();

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		const createResult = service.create({ title: "Task to update" });
		expect(createResult.ok).toBe(true);
		const taskId = createResult.ok ? createResult.value.id : "";

		const { stdout, exitCode } = runSlate([
			"task",
			"update",
			taskId,
			"--priority",
			"high",
			"--dir",
			storeDir,
		]);

		expect(exitCode).toBe(0);
		expect(stdout).toContain(`Updated task: ${taskId}`);

		const filePath = join(storeDir, "tasks", `${taskId}.md`);
		const content = readFileSync(filePath, "utf-8");
		expect(content).toContain("high");
	});

	it("returns error for non-existent task", async () => {
		const storeDir = createTestDir();
		const { stderr, exitCode } = runSlate([
			"task",
			"update",
			"task-999",
			"--status",
			"done",
			"--dir",
			storeDir,
		]);
		expect(exitCode).toBe(1);
		expect(stderr).toContain("not found");
	});

	it("rejects invalid status", async () => {
		const storeDir = createTestDir();

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		const createResult = service.create({ title: "Task" });
		expect(createResult.ok).toBe(true);
		const taskId = createResult.ok ? createResult.value.id : "";

		const { stderr, exitCode } = runSlate([
			"task",
			"update",
			taskId,
			"--status",
			"invalid",
			"--dir",
			storeDir,
		]);
		expect(exitCode).toBe(1);
		expect(stderr).toContain("Invalid status");
	});

	it("rejects invalid priority", async () => {
		const storeDir = createTestDir();

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		const createResult = service.create({ title: "Task" });
		expect(createResult.ok).toBe(true);
		const taskId = createResult.ok ? createResult.value.id : "";

		const { stderr, exitCode } = runSlate([
			"task",
			"update",
			taskId,
			"--priority",
			"invalid",
			"--dir",
			storeDir,
		]);
		expect(exitCode).toBe(1);
		expect(stderr).toContain("Invalid priority");
	});
});

// ---------------------------------------------------------------------------
// CLI prd list
// ---------------------------------------------------------------------------

describe("CLI prd list", () => {
	it("lists all PRDs", async () => {
		const storeDir = createTestDir();

		const { PRDService } = await import("src/prd/PRDService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new PRDService(store);

		service.create({ title: "PRD A" });
		service.create({ title: "PRD B" });

		const { stdout } = runSlate(["prd", "list", "--dir", storeDir]);

		expect(stdout).toContain("prd-001");
		expect(stdout).toContain("PRD A");
		expect(stdout).toContain("prd-002");
		expect(stdout).toContain("PRD B");
	});

	it("prints 'No PRDs found.' when no PRDs exist", async () => {
		const storeDir = createTestDir();
		const { stdout } = runSlate(["prd", "list", "--dir", storeDir]);
		expect(stdout).toContain("No PRDs found.");
	});
});

// ---------------------------------------------------------------------------
// CLI prd show
// ---------------------------------------------------------------------------

describe("CLI prd show", () => {
	it("displays PRD full details", async () => {
		const storeDir = createTestDir();

		const { PRDService } = await import("src/prd/PRDService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new PRDService(store);

		const createResult = service.create({
			title: "Test PRD",
			status: "in-progress",
			priority: "high",
		});
		expect(createResult.ok).toBe(true);
		const prdId = createResult.ok ? createResult.value.id : "";

		const { stdout, exitCode } = runSlate([
			"prd",
			"show",
			prdId,
			"--dir",
			storeDir,
		]);

		expect(exitCode).toBe(0);
		expect(stdout).toContain(`ID:       ${prdId}`);
		expect(stdout).toContain("Title:    Test PRD");
		expect(stdout).toContain("Status:   in-progress");
		expect(stdout).toContain("Priority: high");
		expect(stdout).toContain("Created:");
		expect(stdout).toContain("Updated:");
	});

	it("returns error for non-existent PRD", async () => {
		const storeDir = createTestDir();
		const { stderr, exitCode } = runSlate([
			"prd",
			"show",
			"prd-999",
			"--dir",
			storeDir,
		]);
		expect(exitCode).toBe(1);
		expect(stderr).toContain("not found");
	});
});

// ---------------------------------------------------------------------------
// CLI prd create
// ---------------------------------------------------------------------------

describe("CLI prd create", () => {
	it("creates a PRD and prints confirmation", async () => {
		const storeDir = createTestDir();
		const { stdout, exitCode } = runSlate([
			"prd",
			"create",
			"--title",
			"CLI Test PRD",
			"--priority",
			"high",
			"--dir",
			storeDir,
		]);

		expect(exitCode).toBe(0);
		expect(stdout).toContain("Created PRD:");
		expect(stdout).toContain("CLI Test PRD");

		// Verify file on disk
		const { readFileSync } = await import("node:fs");
		const { join } = await import("node:path");
		const prdDir = join(storeDir, "prds");
		const files = await import("node:fs").then((m) => m.readdirSync(prdDir));
		expect(files.length).toBe(1);

		const filePath = join(prdDir, files[0]);
		const raw = readFileSync(filePath, "utf-8");
		const { data } = await import("gray-matter").then((m) => m.default(raw));
		expect(data.id).toMatch(/^prd-\d{3}$/);
		expect(data.title).toBe("CLI Test PRD");
		expect(data.status).toBe("todo");
		expect(data.priority).toBe("high");
	});

	it("defaults to medium priority and todo status", async () => {
		const storeDir = createTestDir();
		const { stdout } = runSlate([
			"prd",
			"create",
			"--title",
			"Default PRD",
			"--dir",
			storeDir,
		]);

		expect(stdout).toContain("Created PRD:");
	});
});

// ---------------------------------------------------------------------------
// CLI task create
// ---------------------------------------------------------------------------

describe("CLI task create", () => {
	it("creates a task and prints confirmation", async () => {
		const storeDir = createTestDir();
		const { stdout, exitCode } = runSlate([
			"task",
			"create",
			"--title",
			"CLI Test Task",
			"--priority",
			"high",
			"--dir",
			storeDir,
		]);

		expect(exitCode).toBe(0);
		expect(stdout).toContain("Created task:");
		expect(stdout).toContain("CLI Test Task");

		// Verify file on disk
		const { readFileSync, readdirSync } = await import("node:fs");
		const { join } = await import("node:path");
		const taskDir = join(storeDir, "tasks");
		const files = readdirSync(taskDir);
		expect(files.length).toBe(1);

		const filePath = join(taskDir, files[0]);
		const raw = readFileSync(filePath, "utf-8");
		const { data } = await import("gray-matter").then((m) => m.default(raw));
		expect(data.id).toMatch(/^task-\d{3}$/);
		expect(data.title).toBe("CLI Test Task");
		expect(data.priority).toBe("high");
		expect(data.status).toBe("todo");
	});

	it("creates an ad-hoc task without PRD binding", async () => {
		const storeDir = createTestDir();
		const { stdout } = runSlate([
			"task",
			"create",
			"--title",
			"Ad-hoc CLI Task",
			"--priority",
			"low",
			"--dir",
			storeDir,
		]);

		expect(stdout).toContain("Created task:");
	});
});

// ---------------------------------------------------------------------------
// CLI task resolve
// ---------------------------------------------------------------------------

describe("CLI task resolve", () => {
	it("resolves a task and prints confirmation", async () => {
		const storeDir = createTestDir();

		// Create a task via the library first
		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());
		const createResult = service.create({ title: "Task to resolve" });
		expect(createResult.ok).toBe(true);
		const taskId = createResult.ok ? createResult.value.id : "";

		const { stdout, exitCode } = runSlate([
			"task",
			"resolve",
			taskId,
			"--dir",
			storeDir,
		]);

		expect(exitCode).toBe(0);
		expect(stdout).toContain(`Resolved task: ${taskId}`);

		// Verify the task is now done
		const { readFileSync } = await import("node:fs");
		const { join } = await import("node:path");
		const filePath = join(storeDir, "tasks", `${taskId}.md`);
		const raw = readFileSync(filePath, "utf-8");
		const { data } = await import("gray-matter").then((m) => m.default(raw));
		expect(data.status).toBe("done");
	});

	it("prints unblocked tasks when dependents are fully resolved", async () => {
		const storeDir = createTestDir();

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		const parent = assertOk(service.create({ title: "Parent" }));
		const child1 = assertOk(
			service.create({ title: "Child 1", dependencies: [parent.id] }),
		);
		const child2 = assertOk(
			service.create({ title: "Child 2", dependencies: [parent.id] }),
		);

		const { stdout } = runSlate([
			"task",
			"resolve",
			parent.id,
			"--dir",
			storeDir,
		]);

		expect(stdout).toContain(`Resolved task: ${parent.id}`);
		expect(stdout).toContain(`Unblocked tasks: ${child1.id}, ${child2.id}`);
	});

	it("returns error for non-existent task", async () => {
		const storeDir = createTestDir();
		const { stderr, exitCode } = runSlate([
			"task",
			"resolve",
			"task-999",
			"--dir",
			storeDir,
		]);
		expect(exitCode).toBe(1);
		expect(stderr).toContain("not found");
	});
});

// ---------------------------------------------------------------------------
// CLI task delete
// ---------------------------------------------------------------------------

describe("CLI task delete", () => {
	it("deletes a task file and prints confirmation", async () => {
		const storeDir = createTestDir();

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		const createResult = service.create({ title: "Task to delete" });
		expect(createResult.ok).toBe(true);
		const taskId = createResult.ok ? createResult.value.id : "";

		// Verify file exists before deletion
		const filePath = join(storeDir, "tasks", `${taskId}.md`);
		expect(existsSync(filePath)).toBe(true);

		const { stdout, exitCode } = runSlate([
			"task",
			"delete",
			taskId,
			"--dir",
			storeDir,
		]);

		expect(exitCode).toBe(0);
		expect(stdout).toContain(`Deleted task: ${taskId}`);

		// Verify file is removed from disk
		expect(existsSync(filePath)).toBe(false);
	});

	it("returns error for non-existent task", async () => {
		const storeDir = createTestDir();
		const { stderr, exitCode } = runSlate([
			"task",
			"delete",
			"task-999",
			"--dir",
			storeDir,
		]);
		expect(exitCode).toBe(1);
		expect(stderr).toContain("not found");
	});

	it("returns error when store directory does not exist", async () => {
		const storeDir = createTestDir();
		// Don't create any tasks — just try to delete from empty store
		const { stderr, exitCode } = runSlate([
			"task",
			"delete",
			"task-001",
			"--dir",
			storeDir,
		]);
		expect(exitCode).toBe(1);
		expect(stderr).toContain("not found");
	});
});

// ---------------------------------------------------------------------------
// CLI plan
// ---------------------------------------------------------------------------

describe("CLI plan", () => {
	it("shows the highest-priority actionable task", async () => {
		const storeDir = createTestDir();

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		// Create tasks with different priorities
		assertOk(service.create({ title: "Low priority task", priority: "low" }));
		assertOk(service.create({ title: "High priority task", priority: "high" }));
		assertOk(
			service.create({ title: "Medium priority task", priority: "medium" }),
		);

		const { stdout, exitCode } = runSlate(["plan", "--dir", storeDir]);

		expect(exitCode).toBe(0);
		expect(stdout).toContain("High priority task");
		expect(stdout).not.toContain("Low priority task");
		expect(stdout).not.toContain("Medium priority task");
	});

	it("shows the next actionable task when some are blocked", async () => {
		const storeDir = createTestDir();

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		// Create a task that will be blocked (depends on non-existent task)
		const blockingDep = assertOk(
			service.create({ title: "Blocking dep", priority: "low" }),
		);
		// This task depends on blockingDep which is NOT done, so it's blocked
		const blocked = assertOk(
			service.create({
				title: "Blocked task",
				priority: "high",
				dependencies: [blockingDep.id],
			}),
		);
		// This task has no deps, so it's actionable (medium priority)
		const actionable = assertOk(
			service.create({ title: "Actionable task", priority: "medium" }),
		);

		const { stdout, exitCode } = runSlate(["plan", "--dir", storeDir]);

		expect(exitCode).toBe(0);
		expect(stdout).toContain(actionable.title);
		expect(stdout).not.toContain(blocked.title);
	});

	it("prints message when no actionable tasks exist", async () => {
		const storeDir = createTestDir();

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		// Create only done/blocked tasks
		assertOk(service.create({ title: "Done task", status: "done" }));
		assertOk(service.create({ title: "Blocked task", status: "blocked" }));

		const { stdout, exitCode } = runSlate(["plan", "--dir", storeDir]);

		expect(exitCode).toBe(0);
		expect(stdout).toContain("No actionable tasks");
	});

	it("prints message when all tasks are blocked", async () => {
		const storeDir = createTestDir();

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		// Create a blocker task that itself is blocked (depends on a non-existent task)
		const blocker = assertOk(
			service.create({
				title: "Blocker task",
				priority: "high",
				dependencies: ["task-999"],
			}),
		);
		// All other tasks depend on blocker, so they are blocked too
		assertOk(
			service.create({
				title: "Task A",
				priority: "high",
				dependencies: [blocker.id],
			}),
		);
		assertOk(
			service.create({
				title: "Task B",
				priority: "medium",
				dependencies: [blocker.id],
			}),
		);

		const { stdout, exitCode } = runSlate(["plan", "--dir", storeDir]);

		expect(exitCode).toBe(0);
		expect(stdout).toContain("No unblocked tasks");
	});

	it("respects creation order when priorities are equal", async () => {
		const storeDir = createTestDir();

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		// Create two tasks with the same priority
		assertOk(service.create({ title: "First task", priority: "high" }));
		assertOk(service.create({ title: "Second task", priority: "high" }));

		const { stdout, exitCode } = runSlate(["plan", "--dir", storeDir]);

		expect(exitCode).toBe(0);
		expect(stdout).toContain("First task");
	});

	it("excludes done tasks from actionable list", async () => {
		const storeDir = createTestDir();

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		assertOk(service.create({ title: "Active task", priority: "medium" }));
		assertOk(
			service.create({ title: "Done task", status: "done", priority: "high" }),
		);

		const { stdout, exitCode } = runSlate(["plan", "--dir", storeDir]);

		expect(exitCode).toBe(0);
		expect(stdout).toContain("Active task");
		expect(stdout).not.toContain("Done task");
	});
});

// ---------------------------------------------------------------------------
// CLI slate init
// ---------------------------------------------------------------------------

describe("CLI slate init", () => {
	it("creates prds and tasks directories", async () => {
		const { existsSync } = await import("node:fs");
		const { join } = await import("node:path");

		const storeDir = createTestDir();

		const { stdout, exitCode } = runSlate(["init"], { cwd: storeDir });

		expect(exitCode).toBe(0);
		expect(stdout).toContain("Created: slate/prds");
		expect(stdout).toContain("Created: slate/tasks");
		expect(stdout).toContain("Slate initialized at ./slate");

		expect(existsSync(join(storeDir, "slate", "prds"))).toBe(true);
		expect(existsSync(join(storeDir, "slate", "tasks"))).toBe(true);
	});

	it("does not recreate existing directories", async () => {
		const { readdirSync } = await import("node:fs");

		const storeDir = createTestDir();

		// First init
		const first = runSlate(["init"], { cwd: storeDir });
		expect(first.exitCode).toBe(0);

		// Second init — should say "Exists" not "Created"
		const second = runSlate(["init"], { cwd: storeDir });
		expect(second.exitCode).toBe(0);
		expect(second.stdout).toContain("Exists:  slate/prds");
		expect(second.stdout).toContain("Exists:  slate/tasks");

		// Verify only one copy of each dir
		expect(readdirSync(join(storeDir, "slate")).sort()).toEqual([
			"prds",
			"tasks",
		]);
	});
});

// ---------------------------------------------------------------------------
// CLI slate overview
// ---------------------------------------------------------------------------

describe("CLI slate overview", () => {
	it("prints agent-friendly overview", () => {
		const { stdout, exitCode } = runSlate(["overview"]);

		expect(exitCode).toBe(0);
		expect(stdout).toContain("Slate CLI");
		expect(stdout).toContain("slate init");
		expect(stdout).toContain("slate prd");
		expect(stdout).toContain("slate task");
		expect(stdout).toContain("slate plan");
		expect(stdout).toContain("slate task create");
		expect(stdout).toContain("EOF");
		expect(stdout).toContain("Common Patterns");
	});

	it("shows how to use task create with EOF stdin", () => {
		const { stdout } = runSlate(["overview"]);
		expect(stdout).toContain("<<EOF");
		expect(stdout).toContain("EOF");
	});
});
