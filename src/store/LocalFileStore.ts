import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";

import matter from "gray-matter";
import type { PRD, PRDError, Task, TaskError } from "src/prd/types";
import type { IStore } from "src/store/IStore";
import type { Result } from "src/utils/result";
import zod from "zod";

// ---------------------------------------------------------------------------
// LocalFileStore
// ---------------------------------------------------------------------------

const PRD_DIR = "prds";
const PRD_FILE_EXT = ".md";
const TASK_DIR = "tasks";
const TASK_FILE_EXT = ".md";

/**
 * Zod schema for PRD YAML frontmatter.
 */
const frontmatterSchema = zod.object({
	id: zod.string(),
	title: zod.string(),
	status: zod.enum(["todo", "in-progress", "done", "blocked"]),
	priority: zod.enum(["high", "medium", "low"]),
	created: zod.string(),
	updated: zod.string(),
});

/**
 * File-based store implementation that reads and writes PRDs and tasks as
 * Markdown files with YAML frontmatter.
 */
export class LocalFileStore implements IStore {
	#dir: string;

	constructor(dir: string) {
		this.#dir = dir;
	}

	get dir(): string {
		return this.#dir;
	}

	/**
	 * Ensure the store directory and PRD subdirectory exist.
	 */
	private ensureDir(): void {
		const PRDDir = join(this.#dir, PRD_DIR);
		if (!existsSync(PRDDir)) {
			mkdirSync(PRDDir, { recursive: true });
		}
	}

	/**
	 * Generate the next sequential PRD ID by scanning existing files.
	 */
	nextPRDID(): string {
		this.ensureDir();
		const PRDDir = join(this.#dir, PRD_DIR);
		const files = readdirSync(PRDDir).filter((f) => f.endsWith(PRD_FILE_EXT));
		let maxNum = 0;
		for (const file of files) {
			const match = file.match(/^prd-(\d+)/);
			if (match) {
				const num = parseInt(match[1], 10);
				if (num > maxNum) {
					maxNum = num;
				}
			}
		}
		const nextNum = maxNum + 1;
		return `prd-${String(nextNum).padStart(3, "0")}`;
	}

	// -- PRD operations -------------------------------------------------------

	createPRD(prd: PRD): Result<void, PRDError> {
		this.ensureDir();
		const PRDDir = join(this.#dir, PRD_DIR);
		const filePath = join(PRDDir, `${prd.id}${PRD_FILE_EXT}`);

		const frontmatter = {
			id: prd.id,
			title: prd.title,
			status: prd.status,
			priority: prd.priority,
			created: prd.created,
			updated: prd.updated,
		};

		const yaml = matter.stringify("", frontmatter);
		writeFileSync(filePath, yaml, "utf-8");
		return { ok: true, value: undefined };
	}

	readPRD(id: string): Result<PRD, PRDError> {
		const PRDDir = join(this.#dir, PRD_DIR);
		if (!existsSync(PRDDir)) {
			return { ok: false, error: { kind: "not-found", id } };
		}

		const filePath = join(PRDDir, `${id}${PRD_FILE_EXT}`);
		if (!existsSync(filePath)) {
			return { ok: false, error: { kind: "not-found", id } };
		}

		const raw = readFileSync(filePath, "utf-8");
		const { data } = matter(raw);

		const parsed = frontmatterSchema.safeParse(data);
		if (!parsed.success) {
			return {
				ok: false,
				error: {
					kind: "corrupted-file",
					id,
					message: parsed.error.message,
				},
			};
		}

		return {
			ok: true,
			value: {
				id: parsed.data.id,
				title: parsed.data.title,
				status: parsed.data.status,
				priority: parsed.data.priority,
				created: parsed.data.created,
				updated: parsed.data.updated,
			},
		};
	}

	listPRDs(): Result<PRD[], PRDError> {
		const PRDDir = join(this.#dir, PRD_DIR);
		if (!existsSync(PRDDir)) {
			return { ok: true, value: [] };
		}

		const files = readdirSync(PRDDir).filter((f) => f.endsWith(PRD_FILE_EXT));
		const prds: PRD[] = [];

		for (const file of files) {
			const filePath = join(PRDDir, file);
			const raw = readFileSync(filePath, "utf-8");
			const { data } = matter(raw);

			const parsed = frontmatterSchema.safeParse(data);
			if (!parsed.success) {
				continue;
			}

			prds.push({
				id: parsed.data.id,
				title: parsed.data.title,
				status: parsed.data.status,
				priority: parsed.data.priority,
				created: parsed.data.created,
				updated: parsed.data.updated,
			});
		}

		prds.sort((a, b) => a.id.localeCompare(b.id));

		return { ok: true, value: prds };
	}

	// -- Task operations ------------------------------------------------------

	private ensureTaskDir(): void {
		const taskDir = join(this.#dir, TASK_DIR);
		if (!existsSync(taskDir)) {
			mkdirSync(taskDir, { recursive: true });
		}
	}

	nextTaskID(): string {
		this.ensureTaskDir();
		const taskDir = join(this.#dir, TASK_DIR);
		const files = readdirSync(taskDir).filter((f) => f.endsWith(TASK_FILE_EXT));
		let maxNum = 0;
		for (const file of files) {
			const match = file.match(/^(task)-(\d+)/);
			if (match) {
				const num = parseInt(match[2], 10);
				if (num > maxNum) {
					maxNum = num;
				}
			}
		}
		const nextNum = maxNum + 1;
		return `task-${String(nextNum).padStart(3, "0")}`;
	}

	createTask(task: Task): Result<void, TaskError> {
		this.ensureTaskDir();
		const taskDir = join(this.#dir, TASK_DIR);
		const filePath = join(taskDir, `${task.id}${TASK_FILE_EXT}`);

		const frontmatter = {
			id: task.id,
			title: task.title,
			status: task.status,
			priority: task.priority,
			dependencies: task.dependencies,
			...(task.prd !== undefined && { prd: task.prd }),
			created: task.created,
			updated: task.updated,
		};

		const yaml = matter.stringify("", frontmatter);
		writeFileSync(filePath, yaml, "utf-8");
		return { ok: true, value: undefined };
	}

	readTask(id: string): Result<Task, TaskError> {
		const taskDir = join(this.#dir, TASK_DIR);
		if (!existsSync(taskDir)) {
			return { ok: false, error: { kind: "not-found", id } };
		}

		const filePath = join(taskDir, `${id}${TASK_FILE_EXT}`);
		if (!existsSync(filePath)) {
			return { ok: false, error: { kind: "not-found", id } };
		}

		const raw = readFileSync(filePath, "utf-8");
		const { data } = matter(raw);

		const parsed = taskFrontmatterSchema.safeParse(data);
		if (!parsed.success) {
			return {
				ok: false,
				error: {
					kind: "corrupted-file",
					id,
					message: parsed.error.message,
				},
			};
		}

		return {
			ok: true,
			value: {
				id: parsed.data.id,
				title: parsed.data.title,
				status: parsed.data.status,
				priority: parsed.data.priority,
				dependencies: parsed.data.dependencies,
				prd: parsed.data.prd,
				created: parsed.data.created,
				updated: parsed.data.updated,
			},
		};
	}

	listTasks(): Result<Task[], TaskError> {
		const taskDir = join(this.#dir, TASK_DIR);
		if (!existsSync(taskDir)) {
			return { ok: true, value: [] };
		}

		const files = readdirSync(taskDir).filter((f) => f.endsWith(TASK_FILE_EXT));
		const tasks: Task[] = [];

		for (const file of files) {
			const filePath = join(taskDir, file);
			const raw = readFileSync(filePath, "utf-8");
			const { data } = matter(raw);

			const parsed = taskFrontmatterSchema.safeParse(data);
			if (!parsed.success) {
				continue;
			}

			tasks.push({
				id: parsed.data.id,
				title: parsed.data.title,
				status: parsed.data.status,
				priority: parsed.data.priority,
				dependencies: parsed.data.dependencies,
				prd: parsed.data.prd,
				created: parsed.data.created,
				updated: parsed.data.updated,
			});
		}

		tasks.sort((a, b) => a.id.localeCompare(b.id));

		return { ok: true, value: tasks };
	}
}

// ---------------------------------------------------------------------------
// Task frontmatter schema
// ---------------------------------------------------------------------------

const taskFrontmatterSchema = zod.object({
	id: zod.string(),
	title: zod.string(),
	status: zod.enum(["todo", "in-progress", "done", "blocked"]),
	priority: zod.enum(["high", "medium", "low"]),
	dependencies: zod.array(zod.string()),
	prd: zod.string().optional(),
	created: zod.string(),
	updated: zod.string(),
});
