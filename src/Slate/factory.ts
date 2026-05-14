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
 * @returns A new Slate instance.
 */
export function createSlate(dir: string): ISlate {
	return new Slate({ dir });
}
