import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	// Mirrors the `@/*` -> `./*` path mapping in tsconfig.json.
	resolve: {
		alias: { "@": path.resolve(import.meta.dirname) },
	},
	test: {
		// Pure-logic tests only; React Native modules are stubbed in the setup file.
		environment: "node",
		include: ["src/**/*.test.ts"],
		setupFiles: ["./vitest.setup.ts"],
	},
});
