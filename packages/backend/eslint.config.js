// ESLint runs here only for @convex-dev/eslint-plugin (plan D5); Biome does
// everything else. Type-aware so `explicit-table-ids` can infer tables from Id<>.
import convexPlugin from "@convex-dev/eslint-plugin";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
	{ ignores: ["convex/_generated/**"] },
	{
		files: ["convex/**/*.ts"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				// The package tsconfig, not convex/tsconfig.json: it also covers tests.
				project: "./tsconfig.json",
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	...convexPlugin.configs.recommended,
	{
		files: ["convex/**/*.ts"],
		rules: {
			// New in plugin v5. auth.config.ts must read process.env (it is not a
			// function module, so the typed `env` from defineApp is unavailable), and
			// the real backend reads process.env in ~22 modules. Revisit after
			// Phase 2 by declaring env in convex.config.ts.
			"@convex-dev/no-process-env": "off",
		},
	},
]);
