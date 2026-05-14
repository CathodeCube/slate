import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";

import matter from "gray-matter";
import type { PRD, PRDError, PRDStatus, Priority } from "src/prd/types";
import type { IStore } from "src/store/IStore";
import type { Task, TaskError, TaskStatus } from "src/task/types";
import { readEntity } from "src/utils/entity";
import { nextSequentialID } from "src/utils/id";
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
 * Zod schema for Task YAML frontmatter.
 */
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
		const prdDir = join(this.#dir, PRD_DIR);
		if (!existsSync(prdDir)) {
			mkdirSync(prdDir, { recursive: true });
		}
	}

	/**
	 * Generate the next sequential PRD ID by scanning existing files.
	 */
	nextPRDID(): string {
		this.ensureDir();
		const prdDir = join(this.#dir, PRD_DIR);
		return nextSequentialID(prdDir, "prd", PRD_FILE_EXT);
	}

	// -- PRD operations -------------------------------------------------------

	/**
	 * Check if a PRD file exists.
	 */
	existsPRD(id: string): boolean {
		const prdDir = join(this.#dir, PRD_DIR);
		if (!existsSync(prdDir)) {
			return false;
		}
		const filePath = join(prdDir, `${id}${PRD_FILE_EXT}`);
		return existsSync(filePath);
	}

	createPRD(prd: PRD): Result<void, PRDError> {
		this.ensureDir();
		const prdDir = join(this.#dir, PRD_DIR);
		const filePath = join(prdDir, `${prd.id}${PRD_FILE_EXT}`);

		if (existsSync(filePath)) {
			return { ok: false, error: { kind: "already-exists", id: prd.id } };
		}

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
		const prdDir = join(this.#dir, PRD_DIR);
		if (!existsSync(prdDir)) {
			return { ok: false, error: { kind: "not-found", id } };
		}

		const result = readEntity(
			prdDir,
			id,
			PRD_FILE_EXT,
			frontmatterSchema,
			(data: {
				id: string;
				title: string;
				status: string;
				priority: string;
				created: string;
				updated: string;
			}) => ({
				id: data.id,
				title: data.title,
				status: data.status as PRDStatus,
				priority: data.priority as Priority,
				created: data.created,
				updated: data.updated,
			}),
		);

		if (!result.ok) {
			return { ok: false, error: result.error as PRDError };
		}

		return result;
	}

	listPRDs(): Result<PRD[], PRDError> {
		const prdDir = join(this.#dir, PRD_DIR);
		if (!existsSync(prdDir)) {
			return { ok: true, value: [] };
		}

		const files = readdirSync(prdDir).filter((f) => f.endsWith(PRD_FILE_EXT));
		const prds: PRD[] = [];

		for (const file of files) {
			const filePath = join(prdDir, file);
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

	deleteTask(id: string): Result<void, TaskError> {
		const taskDir = join(this.#dir, TASK_DIR);
		if (!existsSync(taskDir)) {
			return { ok: false, error: { kind: "not-found", id } };
		}

		const filePath = join(taskDir, `${id}${TASK_FILE_EXT}`);
		if (!existsSync(filePath)) {
			return { ok: false, error: { kind: "not-found", id } };
		}

		unlinkSync(filePath);
		return { ok: true, value: undefined };
	}

	private ensureTaskDir(): void {
		const taskDir = join(this.#dir, TASK_DIR);
		if (!existsSync(taskDir)) {
			mkdirSync(taskDir, { recursive: true });
		}
	}

	nextTaskID(): string {
		this.ensureTaskDir();
		const taskDir = join(this.#dir, TASK_DIR);
		return nextSequentialID(taskDir, "task", TASK_FILE_EXT);
	}

	createTask(task: Task): Result<void, TaskError> {
		this.ensureTaskDir();
		const taskDir = join(this.#dir, TASK_DIR);
		const filePath = join(taskDir, `${task.id}${TASK_FILE_EXT}`);

		if (existsSync(filePath)) {
			return { ok: false, error: { kind: "already-exists", id: task.id } };
		}

		return this.writeTaskFile(filePath, task);
	}

	/**
	 * Update an existing task file (overwrites without existence check).
	 */
	updateTask(task: Task): Result<void, TaskError> {
		this.ensureTaskDir();
		const taskDir = join(this.#dir, TASK_DIR);
		const filePath = join(taskDir, `${task.id}${TASK_FILE_EXT}`);

		return this.writeTaskFile(filePath, task);
	}

	/**
	 * Write a task file with YAML frontmatter.
	 */
	private writeTaskFile(filePath: string, task: Task): Result<void, TaskError> {
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

		const result = readEntity(
			taskDir,
			id,
			TASK_FILE_EXT,
			taskFrontmatterSchema,
			(data: {
				id: string;
				title: string;
				status: string;
				priority: string;
				dependencies: string[];
				prd?: string;
				created: string;
				updated: string;
			}) => ({
				id: data.id,
				title: data.title,
				status: data.status as TaskStatus,
				priority: data.priority as Priority,
				dependencies: data.dependencies,
				prd: data.prd,
				created: data.created,
				updated: data.updated,
			}),
		);

		if (!result.ok) {
			return { ok: false, error: result.error as TaskError };
		}

		return result;
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
