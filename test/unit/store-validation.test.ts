import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { PRDService } from "src/prd/PRDService";
import { LocalFileStore } from "src/store/LocalFileStore";
import { TaskService } from "src/task/TaskService";
import { createEmptyIndex, createTestDir } from "../utils";

// ---------------------------------------------------------------------------
// listEntities — corrupted file warning
// ---------------------------------------------------------------------------

describe("LocalFileStore — corrupted file warning", () => {
	it("logs a warning when a PRD file has invalid frontmatter", async () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);

		// Create a valid PRD first so the prds/ directory exists
		const prdService = new PRDService(store);
		const validPRD = await prdService.create({ title: "Valid PRD" });
		expect(validPRD.ok).toBe(true);
		if (!validPRD.ok) return;

		// Write a corrupted PRD file (missing required fields)
		const corruptedFile = join(storeDir, "prds", "prd-999.md");
		writeFileSync(
			corruptedFile,
			"---\nid: prd-999\nstatus: todo\n---\ncorrupted body\n",
			"utf-8",
		);

		const warnSpy = vi.spyOn(global.console, "warn");

		const result = await store.listPRDs();
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.length).toBe(1);
		expect(result.value[0].id).toBe(validPRD.value.id);

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Skipping corrupted entity file"),
		);

		warnSpy.mockRestore();
	});
});

// ---------------------------------------------------------------------------
// LocalFileStore — constructor accepts any directory path
// ---------------------------------------------------------------------------

describe("LocalFileStore — constructor", () => {
	it("does not throw when directory does not exist", () => {
		const nonExistent = `${createTestDir()}/does-not-exist`;
		expect(() => new LocalFileStore(nonExistent)).not.toThrow();
		const store = new LocalFileStore(nonExistent);
		expect(store.dir).toBe(nonExistent);
	});

	it("does not throw when path is a file", () => {
		const fileDir = createTestDir();
		const filePath = join(fileDir, "not-a-dir.txt");
		writeFileSync(filePath, "content", "utf-8");

		expect(() => new LocalFileStore(filePath)).not.toThrow();
		const store = new LocalFileStore(filePath);
		expect(store.dir).toBe(filePath);
	});

	it("succeeds with a valid writable directory", () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		expect(store.dir).toBe(storeDir);
	});
});

// ---------------------------------------------------------------------------
// createPRD — already-exists check
// ---------------------------------------------------------------------------

describe("createPRD — already-exists check", () => {
	it("returns already-exists error when PRD file already exists", async () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new PRDService(store);

		const first = await service.create({ title: "First PRD" });
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		// Try to create another PRD with the same ID
		const _duplicate = service.create({
			title: "Duplicate PRD",
		});

		// nextPRDID will generate a new ID, so we need to test via the store directly
		const storeResult = await store.createPRD({
			id: first.value.id,
			title: "Duplicate",
			status: "todo",
			priority: "medium",
			created: new Date().toISOString(),
			updated: new Date().toISOString(),
		});

		expect(storeResult.ok).toBe(false);
		if (storeResult.ok) return;
		expect(storeResult.error.kind).toBe("already-exists");
	});
});

// ---------------------------------------------------------------------------
// createTask — already-exists check
// ---------------------------------------------------------------------------

describe("createTask — already-exists check", () => {
	it("returns already-exists error when task file already exists", async () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		const first = await service.create({ title: "First Task" });
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const duplicate = await store.createTask({
			id: first.value.id,
			title: "Duplicate",
			status: "todo",
			priority: "medium",
			dependencies: [],
			created: new Date().toISOString(),
			updated: new Date().toISOString(),
		});

		expect(duplicate.ok).toBe(false);
		if (duplicate.ok) return;
		expect(duplicate.error.kind).toBe("already-exists");
	});
});

// ---------------------------------------------------------------------------
// TaskService.create — PRD validation
// ---------------------------------------------------------------------------

describe("TaskService.create — PRD validation", () => {
	it("returns not-found error when referenced PRD does not exist", async () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		const result = await service.create({
			title: "Task with missing PRD",
			prd: "prd-999",
		});

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.kind).toBe("not-found");
	});

	it("succeeds when referenced PRD exists", async () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const prdService = new PRDService(store);
		const taskService = new TaskService(store, createEmptyIndex());

		const prdResult = await prdService.create({ title: "Test PRD" });
		expect(prdResult.ok).toBe(true);
		if (!prdResult.ok) return;

		const taskResult = await taskService.create({
			title: "Task with valid PRD",
			prd: prdResult.value.id,
		});

		expect(taskResult.ok).toBe(true);
		if (!taskResult.ok) return;
		expect(taskResult.value.prd).toBe(prdResult.value.id);
	});

	it("does not validate PRD when prd is not provided", async () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new TaskService(store, createEmptyIndex());

		const result = await service.create({
			title: "Ad-hoc task without PRD",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.prd).toBeUndefined();
	});
});
