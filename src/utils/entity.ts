import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import matter from "gray-matter";

// ---------------------------------------------------------------------------
// Generic entity reader
// ---------------------------------------------------------------------------

/**
 * Read an entity file, parse its YAML frontmatter, and validate against
 * the provided Zod schema.
 *
 * @param dir     - Directory containing the entity files.
 * @param id      - Entity ID (used as filename stem).
 * @param ext     - File extension (e.g. ".md").
 * @param schema  - Zod schema to validate the frontmatter data.
 * @param mapRow  - Function to transform parsed data into the entity type.
 * @returns The parsed entity on success, or an error result.
 */
export function readEntity<T, S>(
	dir: string,
	id: string,
	ext: string,
	schema: {
		safeParse(data: unknown): { success: boolean; error?: { message: string } };
	},
	mapRow: (data: S) => T,
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

	// At this point schemaResult is known to be a success case.
	// We cast the data to S because the schema validation guarantees the shape.
	const validatedData = schemaResult as unknown as { success: true; data: S };

	return { ok: true, value: mapRow(validatedData.data) };
}
