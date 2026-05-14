import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { readEntity } from "src/utils/entity";
import zod from "zod";
import { createTestDir } from "../utils";

const testSchema = zod.object({
	id: zod.string(),
	name: zod.string(),
	value: zod.number(),
});

type TestEntity = {
	id: string;
	name: string;
	value: number;
};

describe("readEntity", () => {
	it("returns the parsed entity when the file exists", () => {
		const dir = createTestDir();
		const filePath = join(dir, "test-001.md");

		writeFileSync(
			filePath,
			`---
id: test-001
name: Alpha
value: 42
---

body content
`,
		);

		const result = readEntity<TestEntity>(dir, "test-001", ".md", testSchema);

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.id).toBe("test-001");
		expect(result.value.name).toBe("Alpha");
		expect(result.value.value).toBe(42);
	});

	it("returns NotFound when the file does not exist", () => {
		const dir = createTestDir();

		const result = readEntity<TestEntity>(
			dir,
			"nonexistent",
			".md",
			testSchema,
		);

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.kind).toBe("not-found");
		expect(result.error.id).toBe("nonexistent");
	});

	it("returns CorruptedFile when frontmatter fails Zod validation", () => {
		const dir = createTestDir();
		const filePath = join(dir, "test-002.md");

		writeFileSync(
			filePath,
			`---
id: test-002
name: Beta
value: not-a-number
---

body
`,
		);

		const result = readEntity<TestEntity>(dir, "test-002", ".md", testSchema);

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.kind).toBe("corrupted-file");
		expect(result.error.id).toBe("test-002");
		expect(result.error.message).toContain("value");
	});

	it("returns CorruptedFile when the file has no frontmatter", () => {
		const dir = createTestDir();
		const filePath = join(dir, "test-003.md");

		writeFileSync(filePath, "just raw text\n");

		const result = readEntity<TestEntity>(dir, "test-003", ".md", testSchema);

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.kind).toBe("corrupted-file");
		expect(result.error.id).toBe("test-003");
	});
});
