import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";

import matter from "gray-matter";
import type { PRD, PrdError } from "src/prd/types";
import type { IStore } from "src/store/IStore";
import type { Result } from "src/utils/result";

// ---------------------------------------------------------------------------
// LocalFileStore
// ---------------------------------------------------------------------------

const PRD_DIR = "prds";
const PRD_FILE_EXT = ".md";

/**
 * File-based store implementation that reads and writes PRDs and tasks as
 * Markdown files with YAML frontmatter.
 */
export class LocalFileStore implements IStore {
	private _dir: string;

	constructor(dir: string) {
		this._dir = dir;
	}

	get dir(): string {
		return this._dir;
	}

	/**
	 * Ensure the store directory and PRD subdirectory exist.
	 */
	private ensureDir(): void {
		const prdDir = join(this._dir, PRD_DIR);
		if (!existsSync(prdDir)) {
			mkdirSync(prdDir, { recursive: true });
		}
	}

	/**
	 * Generate the next sequential PRD ID by scanning existing files.
	 */
	nextPrdId(): string {
		this.ensureDir();
		const prdDir = join(this._dir, PRD_DIR);
		const files = readdirSync(prdDir).filter((f) => f.endsWith(PRD_FILE_EXT));
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

	prdCreate(prd: PRD): Result<void, PrdError> {
		this.ensureDir();
		const prdDir = join(this._dir, PRD_DIR);
		const filePath = join(prdDir, `${prd.id}${PRD_FILE_EXT}`);

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

	prdRead(id: string): Result<PRD, PrdError> {
		const prdDir = join(this._dir, PRD_DIR);
		if (!existsSync(prdDir)) {
			return { ok: false, error: { kind: "not-found", id } as PrdError };
		}

		const filePath = join(prdDir, `${id}${PRD_FILE_EXT}`);
		if (!existsSync(filePath)) {
			return { ok: false, error: { kind: "not-found", id } as PrdError };
		}

		const raw = readFileSync(filePath, "utf-8");
		const { data } = matter(raw);

		return {
			ok: true,
			value: {
				id: data.id as string,
				title: data.title as string,
				status: data.status as PRD["status"],
				priority: data.priority as PRD["priority"],
				created: data.created as string,
				updated: data.updated as string,
			},
		};
	}

	prdList(): Result<PRD[], PrdError> {
		const prdDir = join(this._dir, PRD_DIR);
		if (!existsSync(prdDir)) {
			return { ok: true, value: [] };
		}

		const files = readdirSync(prdDir).filter((f) => f.endsWith(PRD_FILE_EXT));
		const prds: PRD[] = [];

		for (const file of files) {
			const filePath = join(prdDir, file);
			const raw = readFileSync(filePath, "utf-8");
			const { data } = matter(raw);
			prds.push({
				id: data.id as string,
				title: data.title as string,
				status: data.status as PRD["status"],
				priority: data.priority as PRD["priority"],
				created: data.created as string,
				updated: data.updated as string,
			});
		}

		return { ok: true, value: prds };
	}
}
