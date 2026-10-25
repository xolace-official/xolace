import { loadEnv } from "vite";
import { configDefaults, defineConfig } from "vitest/config";

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
			include: ["convex/**/*.ts"],
			provider: "v8",
			reporter: ["text"],
			// Floor set just under the observed baseline at xolace_app#252
			// (statements 24.55, branches 23.68, functions 26.92, lines 25.18).
			// Ratchet these up as coverage grows; they exist to catch a drop.
			thresholds: {
				branches: 23,
				functions: 26,
				lines: 24,
				statements: 24,
			},
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
