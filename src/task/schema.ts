/**
 * Zod schema for Task entity serialization.
 *
 * This is the single source of truth for the YAML frontmatter shape of a Task.
 * The schema is exported so that `LocalFileStore` and tests can validate
 * frontmatter data without duplicating the field structure.
 */
import zod from "zod";

/**
 * Zod schema for Task YAML frontmatter fields.
 */
export const taskFrontmatterSchema = zod.object({
	id: zod.string(),
	title: zod.string(),
	status: zod.enum(["todo", "in-progress", "done", "blocked"]),
	priority: zod.enum(["high", "medium", "low"]),
	dependencies: zod.array(zod.string()),
	prd: zod.string().optional(),
	created: zod.string(),
	updated: zod.string(),
});

/**
 * Inferred Task frontmatter data type.
 */
export type TaskFrontmatter = zod.infer<typeof taskFrontmatterSchema>;
