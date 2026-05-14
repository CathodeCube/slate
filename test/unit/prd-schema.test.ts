import { prdFrontmatterSchema } from "src/prd/schema";

// ---------------------------------------------------------------------------
// prdFrontmatterSchema — valid input
// ---------------------------------------------------------------------------

describe("prdFrontmatterSchema — valid input", () => {
	it("accepts all required fields without status", () => {
		const input = {
			id: "prd-001",
			title: "Test PRD",
			priority: "high",
			created: "2026-01-01T00:00:00.000Z",
			updated: "2026-01-01T00:00:00.000Z",
		};

		const result = prdFrontmatterSchema.safeParse(input);

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.id).toBe("prd-001");
		expect(result.data.title).toBe("Test PRD");
		expect(result.data.priority).toBe("high");
	});

	it("accepts status for backward compatibility", () => {
		const input = {
			id: "prd-001",
			title: "Test PRD",
			status: "in-progress" as const,
			priority: "high",
			created: "2026-01-01T00:00:00.000Z",
			updated: "2026-01-01T00:00:00.000Z",
		};

		const result = prdFrontmatterSchema.safeParse(input);

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.status).toBe("in-progress");
	});

	it("accepts optional status values for backward compatibility", () => {
		for (const status of ["todo", "in-progress", "done", "blocked"] as const) {
			const result = prdFrontmatterSchema.safeParse({
				id: "prd-001",
				title: "Test",
				status,
				priority: "medium",
				created: "2026-01-01T00:00:00.000Z",
				updated: "2026-01-01T00:00:00.000Z",
			});
			expect(result.success).toBe(true);
		}
	});

	it("accepts input without status", () => {
		const result = prdFrontmatterSchema.safeParse({
			id: "prd-001",
			title: "Test",
			priority: "medium",
			created: "2026-01-01T00:00:00.000Z",
			updated: "2026-01-01T00:00:00.000Z",
		});
		expect(result.success).toBe(true);
	});

	it("accepts all valid priority values", () => {
		for (const priority of ["high", "medium", "low"] as const) {
			const result = prdFrontmatterSchema.safeParse({
				id: "prd-001",
				title: "Test",
				priority,
				created: "2026-01-01T00:00:00.000Z",
				updated: "2026-01-01T00:00:00.000Z",
			});
			expect(result.success).toBe(true);
		}
	});
});

// ---------------------------------------------------------------------------
// prdFrontmatterSchema — invalid input
// ---------------------------------------------------------------------------

describe("prdFrontmatterSchema — invalid input", () => {
	it("rejects missing required fields", () => {
		const result = prdFrontmatterSchema.safeParse({
			id: "prd-001",
			title: "Test",
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid status value when provided", () => {
		const result = prdFrontmatterSchema.safeParse({
			id: "prd-001",
			title: "Test",
			status: "invalid",
			priority: "medium",
			created: "2026-01-01T00:00:00.000Z",
			updated: "2026-01-01T00:00:00.000Z",
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid priority value", () => {
		const result = prdFrontmatterSchema.safeParse({
			id: "prd-001",
			title: "Test",
			status: "todo",
			priority: "critical",
			created: "2026-01-01T00:00:00.000Z",
			updated: "2026-01-01T00:00:00.000Z",
		});
		expect(result.success).toBe(false);
	});

	it("rejects non-string id", () => {
		const result = prdFrontmatterSchema.safeParse({
			id: 123 as unknown as string,
			title: "Test",
			priority: "medium",
			created: "2026-01-01T00:00:00.000Z",
			updated: "2026-01-01T00:00:00.000Z",
		});
		expect(result.success).toBe(false);
	});

	it("rejects empty object", () => {
		const result = prdFrontmatterSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// prdFrontmatterSchema — round-trip
// ---------------------------------------------------------------------------

describe("prdFrontmatterSchema — round-trip", () => {
	it("parses and re-serializes to the same shape (with status)", () => {
		const input = {
			id: "prd-042",
			title: "Round-trip PRD",
			status: "in-progress",
			priority: "low",
			created: "2026-05-01T12:00:00.000Z",
			updated: "2026-05-13T18:30:00.000Z",
		};

		const parsed = prdFrontmatterSchema.parse(input);
		const result = prdFrontmatterSchema.safeParse(parsed);

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data).toEqual(input);
	});

	it("parses and re-serializes to the same shape (without status)", () => {
		const input = {
			id: "prd-042",
			title: "Round-trip PRD",
			priority: "low",
			created: "2026-05-01T12:00:00.000Z",
			updated: "2026-05-13T18:30:00.000Z",
		};

		const parsed = prdFrontmatterSchema.parse(input);
		const result = prdFrontmatterSchema.safeParse(parsed);

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data).toEqual(input);
	});
});
