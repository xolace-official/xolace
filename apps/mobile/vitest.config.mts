import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	// Mirrors the path mappings in tsconfig.json: `@/assets/*` and `@/modules/*`
	// keep their top-level folders, every other `@/*` resolves into `./src/*`.
	resolve: {
		alias: [
			{
				find: /^@\/(assets|modules)\//,
				replacement: `${path.resolve(import.meta.dirname)}/$1/`,
			},
			{
				find: /^@\//,
				replacement: `${path.resolve(import.meta.dirname, "src")}/`,
			},
		],
	},
	test: {
		// Pure-logic tests only; React Native modules are stubbed in the setup file.
		environment: "node",
		include: ["src/**/*.test.ts", "release/**/*.test.ts"],
		setupFiles: ["./vitest.setup.ts"],
	},
});
