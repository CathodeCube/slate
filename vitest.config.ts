import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			src: path.resolve(__dirname, "src"),
		},
	},
	test: {
		globals: true,
		globalSetup: ["./test/setup.ts"],
		globalTeardown: ["./test/setup.ts"],
	},
});
