import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import matter from "gray-matter";

// ---------------------------------------------------------------------------
// Generic entity reader
// ---------------------------------------------------------------------------

/**
 * Generic entity file reader with YAML frontmatter parsing and Zod validation.
 *
 * Reads a file by ID, extracts YAML frontmatter via `gray-matter`, validates
 * it against a Zod schema, and returns the validated data directly.
 */

/**
 * Read an entity file, parse its YAML frontmatter, and validate against
 * the provided Zod schema.
 *
 * @param dir    - Directory containing the entity files.
 * @param id     - Entity ID (used as filename stem).
 * @param ext    - File extension (e.g. ".md").
 * @param schema - Zod schema to validate the frontmatter data.
 * @returns The validated data on success, or `{ ok: false, error: { kind: "not-found" | "corrupted-file" } }` on failure.
 */
export function readEntity<T>(
	dir: string,
	id: string,
	ext: string,
	schema: {
		safeParse(data: unknown): {
			success: boolean;
			error?: { message: string };
			data?: T;
		};
	},
):
	| { ok: true; value: T }
	| {
			ok: false;
			error: {
				kind: "not-found" | "corrupted-file";
				id: string;
				message?: string;
			};
	  } {
	const filePath = join(dir, `${id}${ext}`);

	if (!existsSync(filePath)) {
		return { ok: false, error: { kind: "not-found", id } };
	}

	const raw = readFileSync(filePath, "utf-8");
	const matterResult = matter(raw);

	const schemaResult = schema.safeParse(matterResult.data);
	if (!schemaResult.success) {
		return {
			ok: false,
			error: {
				kind: "corrupted-file",
				id,
				message: schemaResult.error?.message,
			},
		};
	}

	return { ok: true, value: schemaResult.data as T };
}
