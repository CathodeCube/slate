import { taskFrontmatterSchema } from "src/task/schema";

// ---------------------------------------------------------------------------
// taskFrontmatterSchema — valid input
// ---------------------------------------------------------------------------

describe("taskFrontmatterSchema — valid input", () => {
	it("accepts all required fields", () => {
		const input = {
			id: "task-001",
			title: "Test Task",
			status: "todo",
			priority: "high",
			dependencies: [],
			created: "2026-01-01T00:00:00.000Z",
			updated: "2026-01-01T00:00:00.000Z",
		};

		const result = taskFrontmatterSchema.safeParse(input);

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.id).toBe("task-001");
		expect(result.data.title).toBe("Test Task");
		expect(result.data.status).toBe("todo");
		expect(result.data.priority).toBe("high");
		expect(result.data.dependencies).toEqual([]);
	});

	it("accepts task with PRD reference", () => {
		const result = taskFrontmatterSchema.safeParse({
			id: "task-001",
			title: "PRD-bound Task",
			status: "in-progress",
			priority: "medium",
			dependencies: ["task-000"],
			prd: "prd-001",
			created: "2026-01-01T00:00:00.000Z",
			updated: "2026-01-01T00:00:00.000Z",
		});

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.prd).toBe("prd-001");
	});

	it("accepts task without PRD reference (optional field)", () => {
		const result = taskFrontmatterSchema.safeParse({
			id: "task-001",
			title: "Ad-hoc Task",
			status: "blocked",
			priority: "low",
			dependencies: [],
			created: "2026-01-01T00:00:00.000Z",
			updated: "2026-01-01T00:00:00.000Z",
		});

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.prd).toBeUndefined();
	});

	it("accepts all valid status values", () => {
		for (const status of ["todo", "in-progress", "done", "blocked"] as const) {
			const result = taskFrontmatterSchema.safeParse({
				id: "task-001",
				title: "Test",
				status,
				priority: "medium",
				dependencies: [],
				created: "2026-01-01T00:00:00.000Z",
				updated: "2026-01-01T00:00:00.000Z",
			});
			expect(result.success).toBe(true);
		}
	});

	it("accepts all valid priority values", () => {
		for (const priority of ["high", "medium", "low"] as const) {
			const result = taskFrontmatterSchema.safeParse({
				id: "task-001",
				title: "Test",
				status: "todo",
				priority,
				dependencies: [],
				created: "2026-01-01T00:00:00.000Z",
				updated: "2026-01-01T00:00:00.000Z",
			});
			expect(result.success).toBe(true);
		}
	});

	it("accepts non-empty dependency array", () => {
		const result = taskFrontmatterSchema.safeParse({
			id: "task-001",
			title: "Dependent Task",
			status: "blocked",
			priority: "high",
			dependencies: ["task-000", "task-002", "task-003"],
			created: "2026-01-01T00:00:00.000Z",
			updated: "2026-01-01T00:00:00.000Z",
		});

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.dependencies).toEqual([
			"task-000",
			"task-002",
			"task-003",
		]);
	});
});

// ---------------------------------------------------------------------------
// taskFrontmatterSchema — invalid input
// ---------------------------------------------------------------------------

describe("taskFrontmatterSchema — invalid input", () => {
	it("rejects missing required fields", () => {
		const result = taskFrontmatterSchema.safeParse({
			id: "task-001",
			title: "Test",
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid status value", () => {
		const result = taskFrontmatterSchema.safeParse({
			id: "task-001",
			title: "Test",
			status: "cancelled",
			priority: "medium",
			dependencies: [],
			created: "2026-01-01T00:00:00.000Z",
			updated: "2026-01-01T00:00:00.000Z",
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid priority value", () => {
		const result = taskFrontmatterSchema.safeParse({
			id: "task-001",
			title: "Test",
			status: "todo",
			priority: "urgent",
			dependencies: [],
			created: "2026-01-01T00:00:00.000Z",
			updated: "2026-01-01T00:00:00.000Z",
		});
		expect(result.success).toBe(false);
	});

	it("rejects non-string dependency items", () => {
		const result = taskFrontmatterSchema.safeParse({
			id: "task-001",
			title: "Test",
			status: "todo",
			priority: "medium",
			dependencies: [123 as unknown as string],
			created: "2026-01-01T00:00:00.000Z",
			updated: "2026-01-01T00:00:00.000Z",
		});
		expect(result.success).toBe(false);
	});

	it("rejects empty object", () => {
		const result = taskFrontmatterSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// taskFrontmatterSchema — round-trip
// ---------------------------------------------------------------------------

describe("taskFrontmatterSchema — round-trip", () => {
	it("parses and re-serializes to the same shape", () => {
		const input = {
			id: "task-042",
			title: "Round-trip Task",
			status: "in-progress",
			priority: "low",
			dependencies: ["task-001", "task-002"],
			prd: "prd-001",
			created: "2026-05-01T12:00:00.000Z",
			updated: "2026-05-13T18:30:00.000Z",
		};

		const parsed = taskFrontmatterSchema.parse(input);
		const result = taskFrontmatterSchema.safeParse(parsed);

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data).toEqual(input);
	});

	it("round-trips without prd field", () => {
		const input = {
			id: "task-001",
			title: "Ad-hoc",
			status: "todo",
			priority: "medium",
			dependencies: [],
			created: "2026-05-01T12:00:00.000Z",
			updated: "2026-05-13T18:30:00.000Z",
		};

		const parsed = taskFrontmatterSchema.parse(input);
		const result = taskFrontmatterSchema.safeParse(parsed);

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data).toEqual(input);
	});
});
