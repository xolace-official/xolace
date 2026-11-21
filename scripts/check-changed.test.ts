import { describe, expect, test } from "bun:test";

import {
	findLongFiles,
	findOwningPackage,
	isBiomeSupported,
	isInertPath,
	parseArgs,
	parseTurboFailures,
	pickBaseRef,
	planChecks,
	resolveTestFiles,
	siblingTestCandidates,
	turboArgs,
	turboLintArgs,
} from "./check-changed";
import type { WorkspacePackage } from "./lib/workspace";

const packages: WorkspacePackage[] = [
	{
		biomeOnlyLint: true,
		dir: "apps/web",
		name: "@xolace/web",
		usesVitest: false,
	},
	{
		biomeOnlyLint: true,
		dir: "apps/mobile",
		name: "@xolace/mobile",
		usesVitest: true,
	},
	{
		biomeOnlyLint: false,
		dir: "packages/backend",
		name: "@xolace/backend",
		usesVitest: true,
	},
	{
		biomeOnlyLint: true,
		dir: "packages/ui",
		name: "@xolace/ui",
		usesVitest: false,
	},
];

const existsIn =
	(files: string[]) =>
	(file: string): boolean =>
		files.includes(file);

describe("isInertPath", () => {
	test("markdown, .agents and root docs are inert", () => {
		expect(isInertPath("AGENTS.md")).toBe(true);
		expect(isInertPath("apps/web/AGENTS.md")).toBe(true);
		expect(isInertPath(".agents/rules/convex.md")).toBe(true);
		expect(isInertPath("docs/plan/workspace-migration-plan.md")).toBe(true);
		expect(isInertPath("docs/diagram.png")).toBe(true);
	});

	test("source, mdx content and nested docs apps are not inert", () => {
		expect(isInertPath("apps/web/src/app/page.tsx")).toBe(false);
		expect(isInertPath("apps/docs/content/docs/index.mdx")).toBe(false);
		expect(isInertPath("apps/docs/src/lib/source.ts")).toBe(false);
	});
});

describe("findOwningPackage", () => {
	test("maps a file to the package directory that contains it", () => {
		expect(findOwningPackage("apps/web/src/app/page.tsx", packages)?.name).toBe(
			"@xolace/web"
		);
		expect(
			findOwningPackage("packages/backend/convex/schema.ts", packages)?.name
		).toBe("@xolace/backend");
	});

	test("does not match on a shared name prefix", () => {
		expect(findOwningPackage("apps/website/x.ts", packages)).toBeUndefined();
	});

	test("root files have no owner", () => {
		expect(findOwningPackage("package.json", packages)).toBeUndefined();
		expect(
			findOwningPackage("scripts/check-changed.ts", packages)
		).toBeUndefined();
	});

	test("prefers the deepest matching package", () => {
		const nested: WorkspacePackage[] = [
			...packages,
			{
				biomeOnlyLint: true,
				dir: "apps/web/plugin",
				name: "plugin",
				usesVitest: false,
			},
		];
		expect(findOwningPackage("apps/web/plugin/a.ts", nested)?.name).toBe(
			"plugin"
		);
	});
});

describe("siblingTestCandidates", () => {
	test("lists .test and .spec variants next to a source file", () => {
		const candidates = siblingTestCandidates("apps/mobile/src/lib/foo.ts");
		expect(candidates).toContain("apps/mobile/src/lib/foo.test.ts");
		expect(candidates).toContain("apps/mobile/src/lib/foo.test.tsx");
		expect(candidates).toContain("apps/mobile/src/lib/foo.spec.ts");
	});

	test("test files, declarations and non-source files have none", () => {
		expect(siblingTestCandidates("a/foo.test.ts")).toEqual([]);
		expect(siblingTestCandidates("a/env.d.ts")).toEqual([]);
		expect(siblingTestCandidates("a/styles.css")).toEqual([]);
		expect(siblingTestCandidates("a/README.md")).toEqual([]);
	});
});

describe("resolveTestFiles", () => {
	test("finds existing siblings and keeps changed tests that still exist", () => {
		const exists = existsIn([
			"packages/backend/convex/users.ts",
			"packages/backend/convex/users.test.ts",
			"apps/mobile/src/a.ts",
			"apps/mobile/src/b.test.tsx",
		]);
		const changed = [
			"packages/backend/convex/users.ts",
			"apps/mobile/src/a.ts",
			"apps/mobile/src/b.test.tsx",
			"apps/mobile/src/deleted.test.ts",
		];
		expect(resolveTestFiles(changed, exists)).toEqual([
			"apps/mobile/src/b.test.tsx",
			"packages/backend/convex/users.test.ts",
		]);
	});

	test("deduplicates when both a source and its test changed", () => {
		const exists = existsIn(["x/foo.ts", "x/foo.test.ts"]);
		expect(resolveTestFiles(["x/foo.ts", "x/foo.test.ts"], exists)).toEqual([
			"x/foo.test.ts",
		]);
	});
});

describe("planChecks", () => {
	test("inert-only changes skip typecheck and tests", () => {
		const changed = ["AGENTS.md", ".agents/rules/testing.md"];
		const plan = planChecks(changed, packages, existsIn(changed));
		expect(plan.inertOnly).toBe(true);
		expect(plan.affectedPackages).toEqual([]);
		expect(plan.testGroups).toEqual([]);
		expect(turboArgs(plan)).toBeNull();
	});

	test("maps changes to packages and groups tests by runner", () => {
		const files = [
			"apps/web/src/app/page.tsx",
			"apps/mobile/src/a.ts",
			"apps/mobile/src/a.test.ts",
			"scripts/check-changed.ts",
			"scripts/check-changed.test.ts",
		];
		const plan = planChecks(
			files.filter((f) => !f.includes(".test.")),
			packages,
			existsIn(files)
		);
		expect(plan.affectedPackages).toEqual(["@xolace/mobile", "@xolace/web"]);
		expect(plan.runAllPackages).toBe(false);
		expect(plan.testGroups).toEqual([
			{
				dir: "",
				files: ["scripts/check-changed.test.ts"],
				name: "(repo root)",
				runner: "bun",
			},
			{
				dir: "apps/mobile",
				files: ["src/a.test.ts"],
				name: "@xolace/mobile",
				runner: "vitest",
			},
		]);
		expect(turboArgs(plan)).toContain("--filter=...@xolace/web");
	});

	test("deleted files count for packages but not for biome", () => {
		const plan = planChecks(
			["packages/ui/src/gone.tsx"],
			packages,
			existsIn([])
		);
		expect(plan.biomeFiles).toEqual([]);
		expect(plan.affectedPackages).toEqual(["@xolace/ui"]);
	});

	test("a root config change widens to every package", () => {
		const changed = ["turbo.json"];
		const plan = planChecks(changed, packages, existsIn(changed));
		expect(plan.runAllPackages).toBe(true);
		const args = turboArgs(plan) ?? [];
		expect(args.some((arg) => arg.startsWith("--filter"))).toBe(false);
		const lint = turboLintArgs(plan) ?? [];
		expect(lint).toContain("lint");
		expect(lint.some((arg) => arg.startsWith("--filter"))).toBe(false);
	});

	test("a mobile-only change typechecks mobile and leaves lint to Biome", () => {
		const changed = ["apps/mobile/src/a.tsx"];
		const plan = planChecks(changed, packages, existsIn(changed));
		expect(turboArgs(plan)).toEqual([
			"run",
			"check-types",
			"--filter=...@xolace/mobile",
			"--continue",
			"--output-logs=errors-only",
			"--ui=stream",
		]);
		expect(turboLintArgs(plan)).toBeNull();
	});

	test("a backend change typechecks its dependents but lints only itself", () => {
		const changed = ["packages/backend/convex/a.ts"];
		const plan = planChecks(changed, packages, existsIn(changed));
		expect(turboArgs(plan)).toContain("--filter=...@xolace/backend");
		const lint = turboLintArgs(plan) ?? [];
		expect(lint).toContain("--filter=@xolace/backend");
		expect(lint).not.toContain("--filter=...@xolace/backend");
	});

	test("a package's own lint config brings back its package-wide lint", () => {
		for (const file of ["package.json", "biome.json"]) {
			const changed = [`apps/mobile/${file}`];
			const plan = planChecks(changed, packages, existsIn(changed));
			expect(plan.lintPackages).toEqual(["@xolace/mobile"]);
			expect(plan.lintAll).toBe(false);
		}
	});

	test("the root Biome config lints every package without widening typecheck", () => {
		const changed = ["biome.json"];
		const plan = planChecks(changed, packages, existsIn(changed));
		expect(plan.lintAll).toBe(true);
		expect(plan.runAllPackages).toBe(false);
		expect(turboArgs(plan)).toBeNull();
		expect(turboLintArgs(plan)).not.toBeNull();
	});

	test("biome only sees files it supports", () => {
		expect(isBiomeSupported("a/b.tsx")).toBe(true);
		expect(isBiomeSupported("biome.json")).toBe(true);
		expect(isBiomeSupported("a/b.md")).toBe(false);
		expect(isBiomeSupported(".github/workflows/ci.yml")).toBe(false);
	});
});

describe("plumbing helpers", () => {
	test("parseTurboFailures reads turbo's closing summary", () => {
		const output = [
			" Tasks:    3 successful, 4 total",
			"  Failed:    @xolace/backend#check-types",
			"  Failed:    @xolace/web#lint",
		].join("\n");
		expect(parseTurboFailures(output)).toEqual([
			"@xolace/backend#check-types",
			"@xolace/web#lint",
		]);
	});

	test("parseArgs reads --base and --list", () => {
		expect(parseArgs(["--base", "origin/dev", "--list"])).toEqual({
			base: "origin/dev",
			listOnly: true,
		});
		expect(() => parseArgs(["--base"])).toThrow();
	});
});

describe("pickBaseRef", () => {
	const has =
		(refs: string[]) =>
		(ref: string): boolean =>
			refs.includes(ref);

	test("defaults to dev, preferring origin/dev over the local branch", () => {
		expect(pickBaseRef(has(["main", "origin/main", "dev", "origin/dev"]))).toBe(
			"origin/dev"
		);
		expect(pickBaseRef(has(["main", "origin/main", "dev"]))).toBe("dev");
	});

	test("falls back to main only when no dev ref exists", () => {
		expect(pickBaseRef(has(["main", "origin/main"]))).toBe("origin/main");
		expect(pickBaseRef(has(["main"]))).toBe("main");
	});

	test("--base wins and is never swapped for a default", () => {
		expect(pickBaseRef(has(["origin/dev", "v1.2.0"]), "v1.2.0")).toBe("v1.2.0");
		expect(() => pickBaseRef(has(["origin/dev"]), "nope")).toThrow("nope");
	});

	test("throws with the refs it tried when nothing exists", () => {
		expect(() => pickBaseRef(has([]))).toThrow("origin/dev, dev");
	});
});

describe("findLongFiles", () => {
	test("lists changed .tsx files over 200 lines, longest first", () => {
		const lines: Record<string, number> = {
			"apps/mobile/src/a.tsx": 201,
			"apps/mobile/src/b.tsx": 200,
			"apps/mobile/src/c.test.tsx": 900,
			"apps/mobile/src/c.tsx": 640,
			"apps/mobile/src/d.ts": 900,
		};
		expect(
			findLongFiles(Object.keys(lines), (file) => lines[file] ?? 0)
		).toEqual([
			{ file: "apps/mobile/src/c.tsx", lines: 640 },
			{ file: "apps/mobile/src/a.tsx", lines: 201 },
		]);
	});
});
