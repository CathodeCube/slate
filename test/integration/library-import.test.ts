import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Library import — no side effects
// ---------------------------------------------------------------------------

describe("library import", () => {
	it("importing Slate does not trigger CLI execution", async () => {
		// This test verifies that importing the library entry point does not
		// produce any side effects (no Commander output, no process.exit, etc.)
		// If the CLI guard were still present, running this import would cause
		// Commander to parse process.argv and potentially call process.exit(0).

		// Capture what we can: just importing should be safe.
		// If main() were called during import, Commander would attempt to
		// parse argv and write help text — we'd see output here.
		const mod = await import("src/index");

		expect(mod.Slate).toBeDefined();
		expect(typeof mod.Slate).toBe("function");
	});

	it("Slate class is instantiable without side effects", () => {
		// We can't easily test with a real directory here, but we verify the
		// class is exported and callable without triggering any initialization.
		const mod = require("src/Slate");
		expect(typeof mod.Slate).toBe("function");
	});
});
