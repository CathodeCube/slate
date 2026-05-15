/**
 * Factory for creating Slate instances from a store directory path.
 *
 * The CLI uses this factory instead of importing `LocalFileStore` directly.
 * This keeps the wiring in one place and makes it easy to swap implementations
 * or add a `MemoryStore` in tests.
 */
import type { ISlate } from "src/Slate/ISlate";
import { Slate } from "src/Slate/Slate";

/**
 * Create a Slate instance backed by a file-based store.
 *
 * @param dir - Path to the store directory.
 * @returns A promise for a new Slate instance.
 */
export async function createSlate(dir: string): Promise<ISlate> {
	const result = await Slate.create({ dir });
	if (!result.ok) {
		throw new Error(
			`[slate] Failed to create Slate: ${JSON.stringify(result.error)}`,
		);
	}
	return result.value;
}
