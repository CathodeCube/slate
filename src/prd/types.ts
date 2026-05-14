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

export type PRDError =
	| { kind: "not-found"; id: string }
	| { kind: "invalid-title"; message: string }
	| { kind: "invalid-status"; status: string }
	| { kind: "corrupted-file"; id: string; message: string };

// ---------------------------------------------------------------------------
// Task entity
// ---------------------------------------------------------------------------

/**
 * A task — the fundamental unit of work in Slate.
 */
export interface Task {
	id: string;
	title: string;
	status: TaskStatus;
	priority: Priority;
	dependencies: string[];
	prd?: string;
	created: string;
	updated: string;
}

export type TaskStatus = "todo" | "in-progress" | "done" | "blocked";

// ---------------------------------------------------------------------------
// Task errors
// ---------------------------------------------------------------------------

export type TaskError =
	| { kind: "not-found"; id: string }
	| { kind: "invalid-title"; message: string }
	| { kind: "invalid-status"; status: string }
	| { kind: "invalid-priority"; priority: string }
	| { kind: "corrupted-file"; id: string; message: string }
	| { kind: "cycle-detected"; cycle: string[] };

// ---------------------------------------------------------------------------
// Task query helpers
// ---------------------------------------------------------------------------

export type TaskQueryFilter = (task: Task) => boolean;
