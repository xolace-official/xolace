import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
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
		environment: "node",
		include: [
			"src/**/*.test.ts",
			"release/**/*.test.ts",
			"scripts/**/*.test.ts",
		],
		setupFiles: ["./vitest.setup.ts"],
	},
});
