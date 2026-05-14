// ---------------------------------------------------------------------------
// PRD entity
// ---------------------------------------------------------------------------

/**
 * A Product Requirements Document — a named collection of tasks that define
 * a feature or initiative.
 */
export interface PRD {
	id: string;
	title: string;
	status: PRDStatus;
	priority: Priority;
	created: string;
	updated: string;
}

export type PRDStatus = "todo" | "in-progress" | "done" | "blocked";
export type Priority = "high" | "medium" | "low";

// ---------------------------------------------------------------------------
// PRD errors
// ---------------------------------------------------------------------------

export type PrdError =
	| { kind: "not-found"; id: string }
	| { kind: "invalid-title"; message: string }
	| { kind: "invalid-status"; status: string };
