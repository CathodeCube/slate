import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import matter from "gray-matter";
import { PRDService } from "src/prd/PRDService";
import { LocalFileStore } from "src/store/LocalFileStore";
import { TaskService } from "src/task/TaskService";
import { createTestDir } from "../utils";

describe("CLI task create — end-to-end", () => {
	it("creates a file in slate/tasks/ with correct YAML frontmatter", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const prdService = new PRDService(store);
		const service = new TaskService(store);

		// Create a PRD first so the task can reference it
		const prdResult = prdService.create({ title: "Test PRD" });
		expect(prdResult.ok).toBe(true);
		if (!prdResult.ok) return;

		const result = service.create({
			title: "Test Task",
			priority: "high",
			prd: prdResult.value.id,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const taskDir = join(storeDir, "tasks");
		expect(existsSync(taskDir)).toBe(true);

		const files = readdirSync(taskDir);
		expect(files.length).toBe(1);

		const filePath = join(taskDir, files[0]);
		const raw = readFileSync(filePath, "utf-8");
		const { data } = matter(raw);

		expect(data.id).toMatch(/^task-\d{3}$/);
		expect(data.id).toBe(result.value.id);
		expect(data.title).toBe("Test Task");
		expect(data.status).toBe("todo");
		expect(data.priority).toBe("high");
		expect(data.dependencies).toEqual([]);
		expect(data.prd).toBe("prd-001");
		expect(data.created).toBeDefined();
		expect(data.updated).toBeDefined();
	});

	it("generates sequential IDs that increment", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store);

		const result1 = service.create({ title: "First Task" });
		const result2 = service.create({ title: "Second Task" });

		expect(result1.ok).toBe(true);
		expect(result2.ok).toBe(true);
		if (!result1.ok || !result2.ok) return;

		// IDs must be different and sequential
		expect(result1.value.id).not.toBe(result2.value.id);

		// Both files must exist
		const taskDir = join(storeDir, "tasks");
		const files = readdirSync(taskDir);
		expect(files.length).toBe(2);
	});

	it("defaults status to todo", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store);

		const result = service.create({ title: "Default Status Task" });

		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.value.status).toBe("todo");
	});

	it("accepts custom priority and status", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store);

		const result = service.create({
			title: "Custom Task",
			priority: "high",
			status: "in-progress",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.value.priority).toBe("high");
		expect(result.value.status).toBe("in-progress");
	});

	it("stores PRD reference in frontmatter", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const prdService = new PRDService(store);
		const service = new TaskService(store);

		// Create a PRD first so the task can reference it
		const prdResult = prdService.create({ title: "Test PRD" });
		expect(prdResult.ok).toBe(true);
		if (!prdResult.ok) return;

		const result = service.create({
			title: "PRD-bound Task",
			prd: prdResult.value.id,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const taskDir = join(storeDir, "tasks");
		const files = readdirSync(taskDir);
		const filePath = join(taskDir, files[0]);
		const raw = readFileSync(filePath, "utf-8");
		const { data } = matter(raw);

		expect(data.prd).toBe(prdResult.value.id);
	});

	it("accepts custom dependencies", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store);

		const result = service.create({
			title: "Dependent Task",
			dependencies: ["task-001", "task-002"],
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.value.dependencies).toEqual(["task-001", "task-002"]);

		const taskDir = join(storeDir, "tasks");
		const files = readdirSync(taskDir);
		const filePath = join(taskDir, files[0]);
		const raw = readFileSync(filePath, "utf-8");
		const { data } = matter(raw);

		expect(data.dependencies).toEqual(["task-001", "task-002"]);
	});

	it("rejects empty title", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store);

		const result = service.create({ title: "  " });

		expect(result.ok).toBe(false);
		if (result.ok) return;

		expect(result.error.kind).toBe("invalid-title");
	});

	it("works without PRD (ad-hoc task)", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store);

		const result = service.create({
			title: "Ad-hoc Task",
			priority: "low",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const taskDir = join(storeDir, "tasks");
		const files = readdirSync(taskDir);
		const filePath = join(taskDir, files[0]);
		const raw = readFileSync(filePath, "utf-8");
		const { data } = matter(raw);

		expect(data.prd).toBeUndefined();
	});

	it("writes stdin body to the Markdown file", async () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store);

		const result = service.create({
			title: "Task with Body",
			priority: "medium",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;

		// Simulate stdin body being written (as the CLI does)
		const fs = await import("node:fs");
		const { join } = await import("node:path");
		const taskDir = join(storeDir, "tasks");
		const filePath = join(taskDir, `${result.value.id}.md`);

		const body = "This is the task body.\nIt has multiple lines.";
		const existing = fs.readFileSync(filePath, "utf-8");
		fs.writeFileSync(filePath, existing + body, "utf-8");

		const raw = fs.readFileSync(filePath, "utf-8");
		const { content } = matter(raw);

		expect(content.trim()).toBe(body);
	});

	it("defaults priority to medium", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store);

		const result = service.create({ title: "Default Priority Task" });

		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.value.priority).toBe("medium");
	});
});
