import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import matter from "gray-matter";
import { PRDService } from "src/prd/PRDService";
import { LocalFileStore } from "src/store/LocalFileStore";
import { createTestDir } from "../utils";

describe("CLI prd create — end-to-end", () => {
	it("creates a file in slate/prds/ with correct YAML frontmatter", async () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new PRDService(store);

		const result = await service.create({ title: "Test PRD" });

		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const prdDir = join(storeDir, "prds");
		expect(existsSync(prdDir)).toBe(true);

		const files = readdirSync(prdDir);
		expect(files.length).toBe(1);

		const filePath = join(prdDir, files[0]);
		const raw = readFileSync(filePath, "utf-8");
		const { data } = matter(raw);

		expect(data.id).toMatch(/^prd-\d{3}$/);
		expect(data.title).toBe("Test PRD");
		expect(data.status).toBeUndefined();
		expect(data.priority).toBe("medium");
		expect(data.created).toBeDefined();
		expect(data.updated).toBeDefined();
	});

	it("generates sequential IDs that increment", async () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new PRDService(store);

		const result1 = await service.create({ title: "First PRD" });
		const result2 = await service.create({ title: "Second PRD" });

		expect(result1.ok).toBe(true);
		expect(result2.ok).toBe(true);
		if (!result1.ok || !result2.ok) return;

		// IDs must be different
		expect(result1.value.id).not.toBe(result2.value.id);

		// Both files must exist
		const prdDir = join(storeDir, "prds");
		const files = readdirSync(prdDir);
		expect(files.length).toBe(2);
	});

	it("returns status 'todo' when no children exist", async () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new PRDService(store);

		const result = await service.create({ title: "Default Status PRD" });

		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.value.status).toBe("todo");
	});

	it("accepts custom priority", async () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new PRDService(store);

		const result = await service.create({
			title: "Custom PRD",
			priority: "high",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.value.priority).toBe("high");
		expect(result.value.status).toBe("todo");
	});

	it("rejects empty title", async () => {
		const storeDir = createTestDir();
		const store = new LocalFileStore(storeDir);
		const service = new PRDService(store);

		const result = await service.create({ title: "  " });

		expect(result.ok).toBe(false);
		if (result.ok) return;

		expect(result.error.kind).toBe("invalid-title");
	});
});
