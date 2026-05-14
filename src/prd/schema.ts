/**
 * Zod schema for PRD entity serialization.
 *
 * This is the single source of truth for the YAML frontmatter shape of a PRD.
 * The schema is exported so that `LocalFileStore` and tests can validate
 * frontmatter data without duplicating the field structure.
 */
import zod from "zod";

/**
 * Zod schema for PRD YAML frontmatter fields.
 *
 * Note: `status` is intentionally omitted from the schema. PRD status is
 * derived from child task statuses at read time, not stored in frontmatter.
 * The field is accepted (but not required) for backward compatibility with
 * existing PRD files that still contain it.
 */
export const prdFrontmatterSchema = zod.object({
	id: zod.string(),
	title: zod.string(),
	status: zod.enum(["todo", "in-progress", "done", "blocked"]).optional(),
	priority: zod.enum(["high", "medium", "low"]),
	created: zod.string(),
	updated: zod.string(),
});

/**
 * Inferred PRD frontmatter data type.
 */
export type PRDFrontmatter = zod.infer<typeof prdFrontmatterSchema>;
