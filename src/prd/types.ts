/**
 * PRD entity types, error types, and status/priority enums.
 *
 * Defines the `PRD` interface, `PRDError` discriminated union, and the
 * `PRDStatus` and `Priority` type aliases.
 */

// ---------------------------------------------------------------------------
// PRD entity
// ---------------------------------------------------------------------------

/**
 * A Product Requirements Document — a named collection of tasks that define
 * a feature or initiative.
 *
 * The `status` field is computed from child task statuses at read time.
 * It is not persisted to frontmatter.
 */
export interface PRD {
	id: string;
	title: string;
	/**
	 * Computed status derived from child task statuses:
	 * - "done" if all children are done
	 * - "in-progress" if any child is in-progress
	 * - "todo" otherwise (all todo, or no children)
	 */
	status: PRDStatus;
	priority: Priority;
	created: string;
	updated: string;
}

/**
 * Possible status values for a PRD.
 */
export type PRDStatus = "todo" | "in-progress" | "done" | "blocked";

/**
 * Possible priority levels for a PRD or task.
 */
export type Priority = "high" | "medium" | "low";

// ---------------------------------------------------------------------------
// PRD errors
// ---------------------------------------------------------------------------

export type PRDError =
	| { kind: "not-found"; id: string }
	| { kind: "invalid-title"; message: string }
	| { kind: "invalid-status"; status: string }
	| { kind: "corrupted-file"; id: string; message: string }
	| { kind: "already-exists"; id: string }
	| { kind: "directory-invalid"; path: string; reason: string };
