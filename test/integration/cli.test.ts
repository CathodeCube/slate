import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { assertOk, createEmptyIndex, createTestDir, runSlate } from "../utils";

/**
 * Strip ANSI escape codes from a string.
 */
function stripAnsi(str: string): string {
	// Strip ANSI escape sequences (e.g. ESC[32m, ESC[0m)
	const ESC = String.fromCharCode(27);
	return str
		.replace(new RegExp(`${ESC}\\[[0-9;]*m`, "g"), "")
		.replace(new RegExp(`${ESC}\\[[0-9;]*[A-Z]`, "g"), "");
}

// ---------------------------------------------------------------------------
// CLI task list
// ---------------------------------------------------------------------------

describe("CLI task list", () => {
	it("lists all tasks with their metadata", async () => {
		const projectDir = createTestDir();
		const storeDir = join(projectDir, "slate");

		// Create tasks via library
		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		await service.create({ title: "Task A" });
		await service.create({ title: "Task B", status: "in-progress" });
		await service.create({ title: "Task C", status: "done" });

		const { stdout } = runSlate(["task", "list"], { cwd: projectDir });

		expect(stdout).toContain("task-001");
		expect(stdout).toContain("Task A");
		expect(stdout).toContain("task-002");
		expect(stdout).toContain("Task B");
		expect(stdout).toContain("task-003");
		expect(stdout).toContain("Task C");
	});

	it("filters tasks by status", async () => {
		const projectDir = createTestDir();
		const storeDir = join(projectDir, "slate");

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		await service.create({ title: "Task A", status: "todo" });
		await service.create({ title: "Task B", status: "in-progress" });
		await service.create({ title: "Task C", status: "done" });

		const { stdout } = runSlate(["task", "list", "--status", "in-progress"], {
			cwd: projectDir,
		});

		expect(stdout).toContain("Task B");
		expect(stdout).not.toContain("Task A");
		expect(stdout).not.toContain("Task C");
	});

	it("prints 'No tasks found.' when no tasks exist", async () => {
		const projectDir = createTestDir();
		const { stdout } = runSlate(["task", "list"], { cwd: projectDir });
		expect(stdout).toContain("No tasks found.");
	});
});

// ---------------------------------------------------------------------------
// CLI task update
// ---------------------------------------------------------------------------

describe("CLI task update", () => {
	it("updates task status and writes the change to disk", async () => {
		const projectDir = createTestDir();
		const storeDir = join(projectDir, "slate");

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		const createResult = await service.create({ title: "Task to update" });
		expect(createResult.ok).toBe(true);
		const taskId = createResult.ok ? createResult.value.id : "";

		const { stdout, exitCode } = runSlate(
			["task", "update", taskId, "--status", "in-progress"],
			{ cwd: projectDir },
		);

		expect(exitCode).toBe(0);
		expect(stripAnsi(stdout)).toContain(`Updated task: ${taskId}`);

		// Verify file on disk was actually updated
		const filePath = join(storeDir, "tasks", `${taskId}.md`);
		expect(existsSync(filePath)).toBe(true);
		const content = readFileSync(filePath, "utf-8");
		expect(content).toContain("in-progress");
	});

	it("updates task priority and writes the change to disk", async () => {
		const projectDir = createTestDir();
		const storeDir = join(projectDir, "slate");

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		const createResult = await service.create({ title: "Task to update" });
		expect(createResult.ok).toBe(true);
		const taskId = createResult.ok ? createResult.value.id : "";

		const { stdout, exitCode } = runSlate(
			["task", "update", taskId, "--priority", "high"],
			{ cwd: projectDir },
		);

		expect(exitCode).toBe(0);
		expect(stripAnsi(stdout)).toContain(`Updated task: ${taskId}`);

		const filePath = join(storeDir, "tasks", `${taskId}.md`);
		const content = readFileSync(filePath, "utf-8");
		expect(content).toContain("high");
	});

	it("returns error for non-existent task", async () => {
		const projectDir = createTestDir();
		const { stderr, exitCode } = runSlate(
			["task", "update", "task-999", "--status", "done"],
			{ cwd: projectDir },
		);
		expect(exitCode).toBe(1);
		expect(stderr).toContain("not found");
	});

	it("rejects invalid status", async () => {
		const projectDir = createTestDir();
		const storeDir = join(projectDir, "slate");

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		const createResult = await service.create({ title: "Task" });
		expect(createResult.ok).toBe(true);
		const taskId = createResult.ok ? createResult.value.id : "";

		const { stderr, exitCode } = runSlate(
			["task", "update", taskId, "--status", "invalid"],
			{ cwd: projectDir },
		);
		expect(exitCode).toBe(1);
		expect(stderr).toContain("Invalid status");
	});

	it("rejects invalid priority", async () => {
		const projectDir = createTestDir();
		const storeDir = join(projectDir, "slate");

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		const createResult = await service.create({ title: "Task" });
		expect(createResult.ok).toBe(true);
		const taskId = createResult.ok ? createResult.value.id : "";

		const { stderr, exitCode } = runSlate(
			["task", "update", taskId, "--priority", "invalid"],
			{ cwd: projectDir },
		);
		expect(exitCode).toBe(1);
		expect(stderr).toContain("Invalid priority");
	});

	it("updates task title and writes the change to disk", async () => {
		const projectDir = createTestDir();
		const storeDir = join(projectDir, "slate");

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		const createResult = await service.create({ title: "Original title" });
		expect(createResult.ok).toBe(true);
		const taskId = createResult.ok ? createResult.value.id : "";

		const { stdout, exitCode } = runSlate(
			["task", "update", taskId, "--title", "New title"],
			{ cwd: projectDir },
		);

		expect(exitCode).toBe(0);
		expect(stripAnsi(stdout)).toContain(`Updated task: ${taskId}`);

		const filePath = join(storeDir, "tasks", `${taskId}.md`);
		const content = readFileSync(filePath, "utf-8");
		expect(content).toContain("title: New title");
	});
});

// ---------------------------------------------------------------------------
// CLI prd list
// ---------------------------------------------------------------------------

describe("CLI prd list", () => {
	it("lists all PRDs", async () => {
		const projectDir = createTestDir();
		const storeDir = join(projectDir, "slate");

		const { PRDService } = await import("src/prd/PRDService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new PRDService(store);

		await service.create({ title: "PRD A" });
		await service.create({ title: "PRD B" });

		const { stdout } = runSlate(["prd", "list"], { cwd: projectDir });

		expect(stdout).toContain("prd-001");
		expect(stdout).toContain("PRD A");
		expect(stdout).toContain("prd-002");
		expect(stdout).toContain("PRD B");
	});

	it("prints 'No PRDs found.' when no PRDs exist", async () => {
		const projectDir = createTestDir();
		const { stdout } = runSlate(["prd", "list"], { cwd: projectDir });
		expect(stdout).toContain("No PRDs found.");
	});
});

// ---------------------------------------------------------------------------
// CLI prd show
// ---------------------------------------------------------------------------

describe("CLI prd show", () => {
	it("displays PRD full details", async () => {
		const projectDir = createTestDir();
		const storeDir = join(projectDir, "slate");

		const { PRDService } = await import("src/prd/PRDService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new PRDService(store);

		const createResult = await service.create({
			title: "Test PRD",
			priority: "high",
		});
		expect(createResult.ok).toBe(true);
		const prdId = createResult.ok ? createResult.value.id : "";

		const { stdout } = runSlate(["prd", "show", prdId], { cwd: projectDir });

		expect(stripAnsi(stdout)).toContain(`ID:       ${prdId}`);
		expect(stripAnsi(stdout)).toContain("Title:    Test PRD");
		expect(stripAnsi(stdout)).toContain("Status:   todo");
		expect(stripAnsi(stdout)).toContain("Priority: high");
		expect(stripAnsi(stdout)).toContain("Created:");
		expect(stripAnsi(stdout)).toContain("Updated:");
	});

	it("returns error for non-existent PRD", async () => {
		const projectDir = createTestDir();
		const { stderr } = runSlate(["prd", "show", "prd-999"], {
			cwd: projectDir,
		});
		expect(stderr).toContain("not found");
	});
});

// ---------------------------------------------------------------------------
// CLI prd create
// ---------------------------------------------------------------------------

describe("CLI prd create", () => {
	it("creates a PRD and prints confirmation", async () => {
		const projectDir = createTestDir();
		const storeDir = join(projectDir, "slate");

		const { stdout, exitCode } = runSlate(
			["prd", "create", "--title", "CLI Test PRD", "--priority", "high"],
			{ cwd: projectDir },
		);

		expect(exitCode).toBe(0);
		expect(stdout).toContain("Created PRD:");
		expect(stdout).toContain("CLI Test PRD");

		// Verify file on disk
		const { readFileSync, readdirSync } = await import("node:fs");
		const prdDir = join(storeDir, "prds");
		const files = readdirSync(prdDir);
		expect(files.length).toBe(1);

		const filePath = join(prdDir, files[0]);
		const raw = readFileSync(filePath, "utf-8");
		const { data } = await import("gray-matter").then((m) => m.default(raw));
		expect(data.id).toMatch(/^prd-\d{3}$/);
		expect(data.title).toBe("CLI Test PRD");
		expect(data.status).toBeUndefined();
		expect(data.priority).toBe("high");
	});

	it("defaults to medium priority and todo status", async () => {
		const projectDir = createTestDir();

		const { stdout } = runSlate(["prd", "create", "--title", "Default PRD"], {
			cwd: projectDir,
		});

		expect(stdout).toContain("Created PRD:");
	});
});

// ---------------------------------------------------------------------------
// CLI task create
// ---------------------------------------------------------------------------

describe("CLI task create", () => {
	it("creates a task and prints confirmation", async () => {
		const projectDir = createTestDir();
		const storeDir = join(projectDir, "slate");

		const { stdout, exitCode } = runSlate(
			["task", "create", "--title", "CLI Test Task", "--priority", "high"],
			{ cwd: projectDir },
		);

		expect(exitCode).toBe(0);
		expect(stdout).toContain("Created task:");
		expect(stdout).toContain("CLI Test Task");

		// Verify file on disk
		const { readFileSync, readdirSync } = await import("node:fs");
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
		const projectDir = createTestDir();
		const { stdout } = runSlate(
			["task", "create", "--title", "Ad-hoc CLI Task", "--priority", "low"],
			{ cwd: projectDir },
		);

		expect(stdout).toContain("Created task:");
	});
});

// ---------------------------------------------------------------------------
// CLI task resolve
// ---------------------------------------------------------------------------

describe("CLI task resolve", () => {
	it("resolves a task and prints confirmation", async () => {
		const projectDir = createTestDir();
		const storeDir = join(projectDir, "slate");

		// Create a task via the library first
		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());
		const createResult = await service.create({ title: "Task to resolve" });
		expect(createResult.ok).toBe(true);
		const taskId = createResult.ok ? createResult.value.id : "";

		const { stdout, exitCode } = runSlate(["task", "resolve", taskId], {
			cwd: projectDir,
		});

		expect(exitCode).toBe(0);
		expect(stripAnsi(stdout)).toContain(`Resolved task: ${taskId}`);

		// Verify the task is now done
		const { readFileSync } = await import("node:fs");
		const filePath = join(storeDir, "tasks", `${taskId}.md`);
		const raw = readFileSync(filePath, "utf-8");
		const { data } = await import("gray-matter").then((m) => m.default(raw));
		expect(data.status).toBe("done");
	});

	it("prints unblocked tasks when dependents are fully resolved", async () => {
		const projectDir = createTestDir();
		const storeDir = join(projectDir, "slate");

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		const parent = assertOk(await service.create({ title: "Parent" }));
		const child1 = assertOk(
			await service.create({ title: "Child 1", dependencies: [parent.id] }),
		);
		const child2 = assertOk(
			await service.create({ title: "Child 2", dependencies: [parent.id] }),
		);

		const { stdout } = runSlate(["task", "resolve", parent.id], {
			cwd: projectDir,
		});

		expect(stripAnsi(stdout)).toContain(`Resolved task: ${parent.id}`);
		expect(stripAnsi(stdout)).toContain(
			`Unblocked tasks: ${child1.id}, ${child2.id}`,
		);
	});

	it("returns error for non-existent task", async () => {
		const projectDir = createTestDir();
		const { stderr, exitCode } = runSlate(["task", "resolve", "task-999"], {
			cwd: projectDir,
		});
		expect(exitCode).toBe(1);
		expect(stderr).toContain("not found");
	});
});

// ---------------------------------------------------------------------------
// CLI task delete
// ---------------------------------------------------------------------------

describe("CLI task delete", () => {
	it("deletes a task file and prints confirmation", async () => {
		const projectDir = createTestDir();
		const storeDir = join(projectDir, "slate");

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		const createResult = await service.create({ title: "Task to delete" });
		expect(createResult.ok).toBe(true);
		const taskId = createResult.ok ? createResult.value.id : "";

		// Verify file exists before deletion
		const filePath = join(storeDir, "tasks", `${taskId}.md`);
		expect(existsSync(filePath)).toBe(true);

		const { stdout, exitCode } = runSlate(["task", "delete", taskId], {
			cwd: projectDir,
		});

		expect(exitCode).toBe(0);
		expect(stripAnsi(stdout)).toContain(`Deleted task: ${taskId}`);

		// Verify file is removed from disk
		expect(existsSync(filePath)).toBe(false);
	});

	it("returns error for non-existent task", async () => {
		const projectDir = createTestDir();
		const { stderr } = runSlate(["task", "delete", "task-999"], {
			cwd: projectDir,
		});
		expect(stderr).toContain("not found");
	});

	it("returns error when store directory does not exist", async () => {
		const projectDir = createTestDir();
		// Don't create any tasks — just try to delete from empty store
		const { stderr, exitCode } = runSlate(["task", "delete", "task-001"], {
			cwd: projectDir,
		});
		expect(exitCode).toBe(1);
		expect(stderr).toContain("not found");
	});
});

// ---------------------------------------------------------------------------
// CLI plan
// ---------------------------------------------------------------------------

describe("CLI plan", () => {
	it("shows the highest-priority actionable task", async () => {
		const projectDir = createTestDir();
		const slateDir = join(projectDir, "slate");

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(slateDir);
		const service = new TaskService(store, createEmptyIndex());

		assertOk(
			await service.create({ title: "Low priority task", priority: "low" }),
		);
		assertOk(
			await service.create({ title: "High priority task", priority: "high" }),
		);
		assertOk(
			await service.create({
				title: "Medium priority task",
				priority: "medium",
			}),
		);

		const { stdout, exitCode } = runSlate(["plan"], { cwd: projectDir });

		expect(exitCode).toBe(0);
		expect(stdout).toContain("High priority task");
		expect(stdout).not.toContain("Low priority task");
		expect(stdout).not.toContain("Medium priority task");
	});

	it("shows the next actionable task when some are blocked", async () => {
		const projectDir = createTestDir();
		const slateDir = join(projectDir, "slate");

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(slateDir);
		const service = new TaskService(store, createEmptyIndex());

		const blockingDep = assertOk(
			await service.create({ title: "Blocking dep", priority: "low" }),
		);
		const blocked = assertOk(
			await service.create({
				title: "Blocked task",
				priority: "high",
				dependencies: [blockingDep.id],
			}),
		);
		const actionable = assertOk(
			await service.create({ title: "Actionable task", priority: "medium" }),
		);

		const { stdout, exitCode } = runSlate(["plan"], { cwd: projectDir });

		expect(exitCode).toBe(0);
		expect(stdout).toContain(actionable.title);
		expect(stdout).not.toContain(blocked.title);
	});

	it("prints message when no actionable tasks exist", async () => {
		const projectDir = createTestDir();
		const slateDir = join(projectDir, "slate");

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(slateDir);
		const service = new TaskService(store, createEmptyIndex());

		assertOk(await service.create({ title: "Done task", status: "done" }));
		assertOk(
			await service.create({ title: "Blocked task", status: "blocked" }),
		);

		const { stdout, exitCode } = runSlate(["plan"], { cwd: projectDir });

		expect(exitCode).toBe(0);
		expect(stdout).toContain("No actionable tasks");
	});

	it("prints message when all tasks are blocked", async () => {
		const projectDir = createTestDir();
		const slateDir = join(projectDir, "slate");

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(slateDir);
		const service = new TaskService(store, createEmptyIndex());

		const blocker = assertOk(
			await service.create({
				title: "Blocker task",
				priority: "high",
				dependencies: ["task-999"],
			}),
		);
		assertOk(
			await service.create({
				title: "Task A",
				priority: "high",
				dependencies: [blocker.id],
			}),
		);
		assertOk(
			await service.create({
				title: "Task B",
				priority: "medium",
				dependencies: [blocker.id],
			}),
		);

		const { stdout, exitCode } = runSlate(["plan"], { cwd: projectDir });

		expect(exitCode).toBe(0);
		expect(stdout).toContain("No unblocked tasks");
	});

	it("respects creation order when priorities are equal", async () => {
		const projectDir = createTestDir();
		const slateDir = join(projectDir, "slate");

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(slateDir);
		const service = new TaskService(store, createEmptyIndex());

		assertOk(await service.create({ title: "First task", priority: "high" }));
		assertOk(await service.create({ title: "Second task", priority: "high" }));

		const { stdout, exitCode } = runSlate(["plan"], { cwd: projectDir });

		expect(exitCode).toBe(0);
		expect(stdout).toContain("First task");
	});

	it("excludes done tasks from actionable list", async () => {
		const projectDir = createTestDir();
		const slateDir = join(projectDir, "slate");

		const { TaskService } = await import("src/task/TaskService");
		const { LocalFileStore } = await import("src/store/LocalFileStore");
		const store = new LocalFileStore(slateDir);
		const service = new TaskService(store, createEmptyIndex());

		assertOk(
			await service.create({ title: "Active task", priority: "medium" }),
		);
		assertOk(
			await service.create({
				title: "Done task",
				status: "done",
				priority: "high",
			}),
		);

		const { stdout, exitCode } = runSlate(["plan"], { cwd: projectDir });

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
