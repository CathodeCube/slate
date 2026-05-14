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
import { prdFrontmatterSchema } from "src/prd/schema";
import type { PRD, PRDError } from "src/prd/types";
import type { IStore } from "src/store/IStore";
import { taskFrontmatterSchema } from "src/task/schema";
import type { Task, TaskError } from "src/task/types";
import { readEntity } from "src/utils/entity";
import { nextSequentialID } from "src/utils/id";
import type { Result } from "src/utils/result";

// ---------------------------------------------------------------------------
// LocalFileStore
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Store constants
// ---------------------------------------------------------------------------

/**
 * Directory name for PRD files within the store.
 */
const PRD_DIR = "prds";

/**
 * File extension for PRD markdown files.
 */
const PRD_FILE_EXT = ".md";

/**
 * Directory name for task files within the store.
 */
const TASK_DIR = "tasks";

/**
 * File extension for task markdown files.
 */
const TASK_FILE_EXT = ".md";

/**
 * Read all entity files from a directory, parsing and validating each.
 *
 * Skips files that fail schema validation (corrupted frontmatter).
 *
 * @param dir   - Directory containing entity files.
 * @param ext   - File extension to filter.
 * @param schema - Zod schema for frontmatter validation.
 * @returns Array of successfully parsed entities, sorted by ID.
 */
function listEntities<T extends { id: string }>(
	dir: string,
	ext: string,
	schema: {
		safeParse(data: unknown): {
			success: boolean;
			data?: T;
			error?: { message: string };
		};
	},
): T[] {
	if (!existsSync(dir)) {
		return [];
	}

	const files = readdirSync(dir).filter((f) => f.endsWith(ext));
	const entities: T[] = [];

	for (const file of files) {
		const filePath = join(dir, file);
		const raw = readFileSync(filePath, "utf-8");
		const { data } = matter(raw);

		const parsed = schema.safeParse(data);
		if (!parsed.success) {
			continue;
		}

		entities.push(parsed.data as T);
	}

	entities.sort((a, b) => a.id.localeCompare(b.id));
	return entities;
}

// ---------------------------------------------------------------------------
// LocalFileStore
// ---------------------------------------------------------------------------

/**
 * File-based store implementation that reads and writes PRDs and tasks as
 * Markdown files with YAML frontmatter.
 *
 * Implements `IStore` by serializing entities to `.md` files with YAML frontmatter
 * using `gray-matter` and validating with Zod schemas.
 */
export class LocalFileStore implements IStore {
	#dir: string;

	/**
	 * Create a new LocalFileStore backed by the given directory.
	 *
	 * @param dir - Path to the store directory containing `prds/` and `tasks/` subdirectories.
	 */
	constructor(dir: string) {
		this.#dir = dir;
	}

	/**
	 * Get the store directory path.
	 */
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
	 *
	 * @returns The next available PRD ID (e.g. `prd-004`).
	 */
	nextPRDID(): string {
		this.ensureDir();
		const prdDir = join(this.#dir, PRD_DIR);
		return nextSequentialID(prdDir, "prd", PRD_FILE_EXT);
	}

	// -- PRD operations -------------------------------------------------------

	/**
	 * Check if a PRD file exists.
	 *
	 * @param id - The PRD ID to check.
	 * @returns True if the PRD file exists, false otherwise.
	 */
	existsPRD(id: string): boolean {
		const prdDir = join(this.#dir, PRD_DIR);
		if (!existsSync(prdDir)) {
			return false;
		}
		const filePath = join(prdDir, `${id}${PRD_FILE_EXT}`);
		return existsSync(filePath);
	}

	/**
	 * Create a new PRD file in the store.
	 *
	 * @param prd - The PRD entity to write.
	 * @returns Success on write, or `already-exists` if a file with the same ID already exists.
	 */
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

	/**
	 * Read a PRD file from the store.
	 *
	 * @param id - The PRD ID to read.
	 * @returns The parsed PRD entity on success, or an error if the file is missing or corrupted.
	 */
	readPRD(id: string): Result<PRD, PRDError> {
		const prdDir = join(this.#dir, PRD_DIR);
		if (!existsSync(prdDir)) {
			return { ok: false, error: { kind: "not-found", id } };
		}

		const result = readEntity(prdDir, id, PRD_FILE_EXT, prdFrontmatterSchema);

		if (!result.ok) {
			return { ok: false, error: result.error as PRDError };
		}

		return result;
	}

	/**
	 * Read all PRD files from the store.
	 *
	 * @returns All PRD entities sorted by ID, or an empty array if the directory does not exist.
	 */
	listPRDs(): Result<PRD[], PRDError> {
		const prdDir = join(this.#dir, PRD_DIR);
		return {
			ok: true,
			value: listEntities(prdDir, PRD_FILE_EXT, prdFrontmatterSchema),
		};
	}

	// -- Task operations ------------------------------------------------------

	/**
	 * Delete a task file from the store.
	 *
	 * @param id - The task ID to delete.
	 * @returns Success on deletion, or `not-found` if the task does not exist.
	 */
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

	/**
	 * Ensure the task subdirectory exists.
	 */
	private ensureTaskDir(): void {
		const taskDir = join(this.#dir, TASK_DIR);
		if (!existsSync(taskDir)) {
			mkdirSync(taskDir, { recursive: true });
		}
	}

	/**
	 * Generate the next sequential task ID by scanning existing files.
	 *
	 * @returns The next available task ID (e.g. `task-004`).
	 */
	nextTaskID(): string {
		this.ensureTaskDir();
		const taskDir = join(this.#dir, TASK_DIR);
		return nextSequentialID(taskDir, "task", TASK_FILE_EXT);
	}

	/**
	 * Create a new task file in the store.
	 *
	 * @param task - The task entity to write.
	 * @returns Success on write, or `already-exists` if a file with the same ID already exists.
	 */
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
	 *
	 * @param task - The task entity to write.
	 * @returns Always succeeds — the caller is responsible for ensuring the task exists.
	 */
	updateTask(task: Task): Result<void, TaskError> {
		this.ensureTaskDir();
		const taskDir = join(this.#dir, TASK_DIR);
		const filePath = join(taskDir, `${task.id}${TASK_FILE_EXT}`);

		return this.writeTaskFile(filePath, task);
	}

	/**
	 * Write a task file with YAML frontmatter.
	 *
	 * Preserves the existing body content when updating an existing file.
	 *
	 * @param filePath - The full path to write the task file.
	 * @param task - The task entity to serialize.
	 * @returns Always succeeds as errors are handled by the caller before invoking this method.
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

		let body = "";
		if (existsSync(filePath)) {
			const existing = readFileSync(filePath, "utf-8");
			body = matter(existing).content;
		}

		const yaml = matter.stringify(body, frontmatter);
		writeFileSync(filePath, yaml, "utf-8");
		return { ok: true, value: undefined };
	}

	/**
	 * Read a task file from the store.
	 *
	 * @param id - The task ID to read.
	 * @returns The parsed task entity on success, or an error if the file is missing or corrupted.
	 */
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
		);

		if (!result.ok) {
			return { ok: false, error: result.error as TaskError };
		}

		return result;
	}

	/**
	 * Read all task files from the store.
	 *
	 * @returns All task entities sorted by ID, or an empty array if the directory does not exist.
	 */
	listTasks(): Result<Task[], TaskError> {
		const taskDir = join(this.#dir, TASK_DIR);
		return {
			ok: true,
			value: listEntities(taskDir, TASK_FILE_EXT, taskFrontmatterSchema),
		};
	}
}
