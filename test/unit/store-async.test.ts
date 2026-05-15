import { LocalFileStore } from "src/store/LocalFileStore";
import { createTestDir } from "../utils";

// ---------------------------------------------------------------------------
// IStore async interface contract
// ---------------------------------------------------------------------------

describe("IStore — async interface contract", () => {
	let store: LocalFileStore;
	let storeDir: string;

	beforeEach(() => {
		storeDir = createTestDir();
		store = new LocalFileStore(storeDir);
	});

	// -- PRD operations -------------------------------------------------------

	it("existsPRD is async and returns boolean", async () => {
		const result = await store.existsPRD("prd-001");
		expect(result).toBe(false);
	});

	it("createPRD returns a Promise<Result>", async () => {
		const result = store.createPRD({
			id: "prd-001",
			title: "Test",
			status: "todo",
			priority: "medium",
			created: new Date().toISOString(),
			updated: new Date().toISOString(),
		});
		await expect(result).resolves.toHaveProperty("ok", true);
	});

	it("readPRD returns a Promise<Result<PRD, PRDError>>", async () => {
		const result = await store.readPRD("prd-001");
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.kind).toBe("not-found");
	});

	it("listPRDs returns a Promise<Result<PRD[], PRDError>>", async () => {
		const result = store.listPRDs();
		await expect(result).resolves.toHaveProperty("ok", true);
	});

	it("nextPRDID is synchronous and returns a string", () => {
		const id = store.nextPRDID();
		expect(typeof id).toBe("string");
		expect(id).toMatch(/^prd-\d{3}$/);
	});

	// -- Task operations ------------------------------------------------------

	it("createTask returns a Promise<Result>", async () => {
		const result = store.createTask({
			id: "task-001",
			title: "Test",
			status: "todo",
			priority: "medium",
			dependencies: [],
			created: new Date().toISOString(),
			updated: new Date().toISOString(),
		});
		await expect(result).resolves.toHaveProperty("ok", true);
	});

	it("updateTask returns a Promise<Result>", async () => {
		const result = store.updateTask({
			id: "task-001",
			title: "Test",
			status: "todo",
			priority: "medium",
			dependencies: [],
			created: new Date().toISOString(),
			updated: new Date().toISOString(),
		});
		await expect(result).resolves.toHaveProperty("ok", true);
	});

	it("readTask returns a Promise<Result<Task, TaskError>>", async () => {
		const result = await store.readTask("task-001");
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.kind).toBe("not-found");
	});

	it("listTasks returns a Promise<Result<Task[], TaskError>>", async () => {
		const result = store.listTasks();
		await expect(result).resolves.toHaveProperty("ok", true);
	});

	it("nextTaskID is synchronous and returns a string", () => {
		const id = store.nextTaskID();
		expect(typeof id).toBe("string");
		expect(id).toMatch(/^task-\d{3}$/);
	});

	it("deleteTask returns a Promise<Result>", async () => {
		const result = await store.deleteTask("task-001");
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.kind).toBe("not-found");
	});
});
