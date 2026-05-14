import type { Priority } from "src/prd/types";

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
	| { kind: "cycle-detected"; cycle: string[] }
	| { kind: "already-exists"; id: string }
	| { kind: "already-done"; id: string }
	| { kind: "directory-invalid"; path: string; reason: string };

// ---------------------------------------------------------------------------
// Task query helpers
// ---------------------------------------------------------------------------

export type TaskQueryFilter = (task: Task) => boolean;
