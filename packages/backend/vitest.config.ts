import { loadEnv } from "vite";
import { configDefaults, defineConfig } from "vitest/config";

// Mirrors xolace_app/vitest.config.ts (backend half) so the real convex/ drops
// in during Phase 2 without touching this file.

const RUN_EVALS = process.env.RUN_EVALS === "1";

// Outside evals the key is dropped, so no test can reach the live API.
const withoutAnthropicKey = (env: Record<string, string>) => {
	if (!RUN_EVALS) {
		const { ANTHROPIC_API_KEY: _dropped, ...rest } = env;
		return rest;
	}
	return env;
};

export default defineConfig({
	test: {
		coverage: {
			include: ["convex/**"],
			provider: "v8",
			reporter: ["text"],
			// Phase 2 restores the real app's floor once its tests move in:
			// statements 24, branches 23, functions 26, lines 24.
		},
		// vitest only exposes VITE_-prefixed vars by default; an empty prefix loads
		// everything from .env.test / .env.test.local into process.env.
		env: withoutAnthropicKey(loadEnv("test", process.cwd(), "")),
		// Default runtime. Tests needing convex-test opt in per-file with
		// `// @vitest-environment edge-runtime` as line 1 (the real backend has
		// pure-logic tests that rely on Node APIs, so the default stays `node`).
		environment: "node",
		// Live evals spend Anthropic credits: excluded from every run (local and
		// CI) unless RUN_EVALS=1 opts in.
		exclude: [
			...configDefaults.exclude,
			...(RUN_EVALS ? [] : ["**/*.eval.test.ts"]),
		],
		include: ["convex/**/*.test.ts"],
		// edge-runtime workers occasionally race their console.log RPC against
		// worker teardown ("Closing rpc while onUserConsoleLog was pending"). One
		// retry absorbs that flake in CI.
		retry: process.env.CI ? 1 : 0,
	},
});
