/**
 * Checks only what changed since the merge-base with main (or `--base <ref>`):
 *   1. Biome on changed files Biome understands.
 *   2. `turbo run check-types lint` for the packages that own changed files,
 *      plus everything that depends on them (`--filter=...<pkg>`).
 *   3. Test files that sit next to changed source (`foo.ts` -> `foo.test.ts`)
 *      and changed test files, run through the owning package's runner.
 *
 * Usage: bun run check:changed [--base <ref>] [--list]
 *   --list  print the plan and exit without running anything.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, posix } from "node:path";

import {
	findRepoRoot,
	git,
	listWorkspacePackages,
	type WorkspacePackage,
} from "./lib/workspace";

const DEFAULT_BASE_CANDIDATES = ["main", "origin/main"] as const;

/** Paths that never affect typecheck or tests. Biome still sees them. */
const INERT_PREFIXES = [".agents/", "docs/"] as const;
const INERT_EXTENSIONS = [".md"] as const;

/** Root files that change how every package builds; they widen to "all". */
const GLOBAL_FILES = new Set([
	"bun.lock",
	"bunfig.toml",
	"package.json",
	"tsconfig.json",
	"turbo.json",
]);

const BIOME_EXTENSIONS = new Set([
	".cjs",
	".css",
	".cts",
	".js",
	".json",
	".jsonc",
	".jsx",
	".mjs",
	".mts",
	".ts",
	".tsx",
]);

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"];
const TEST_INFIXES = [".test", ".spec"] as const;
const TEST_FILE_PATTERN = /\.(test|spec)\.[cm]?[jt]sx?$/;
const DECLARATION_FILE_PATTERN = /\.d\.[cm]?ts$/;

/** Everything a passing local run still does not prove. Printed at the end. */
const CI_ONLY = [
	"typecheck/lint/test of packages not affected by your diff",
	"tests that are not siblings of a changed file (full `turbo run test`)",
	"Convex codegen drift (`convex codegen` + `git diff --exit-code`)",
	"production builds (next build, expo/EAS, tauri)",
	"web/admin Playwright E2E and mobile argent flows",
	"live evals for convex/ai/**",
	"bun audit and the semantic PR title check",
] as const;

// ---------------------------------------------------------------------------
// Pure planning (unit-tested in check-changed.test.ts)
// ---------------------------------------------------------------------------

export const isInertPath = (file: string): boolean =>
	INERT_PREFIXES.some((prefix) => file.startsWith(prefix)) ||
	INERT_EXTENSIONS.some((ext) => file.endsWith(ext));

export const isGlobalFile = (file: string): boolean => GLOBAL_FILES.has(file);

export const isBiomeSupported = (file: string): boolean =>
	BIOME_EXTENSIONS.has(posix.extname(file));

export const isTestFile = (file: string): boolean =>
	TEST_FILE_PATTERN.test(file);

/** The package whose directory contains `file` (longest match), if any. */
export const findOwningPackage = (
	file: string,
	packages: readonly WorkspacePackage[]
): WorkspacePackage | undefined => {
	let owner: WorkspacePackage | undefined;
	for (const pkg of packages) {
		const inside = file.startsWith(`${pkg.dir}/`);
		if (inside && (!owner || pkg.dir.length > owner.dir.length)) {
			owner = pkg;
		}
	}
	return owner;
};

/** `src/foo.ts` -> `src/foo.test.ts`, `src/foo.test.tsx`, `src/foo.spec.ts`, ... */
export const siblingTestCandidates = (file: string): string[] => {
	const ext = posix.extname(file);
	if (
		!SOURCE_EXTENSIONS.includes(ext) ||
		isTestFile(file) ||
		DECLARATION_FILE_PATTERN.test(file)
	) {
		return [];
	}
	const stem = file.slice(0, -ext.length);
	const candidates: string[] = [];
	for (const infix of TEST_INFIXES) {
		for (const testExt of SOURCE_EXTENSIONS) {
			candidates.push(`${stem}${infix}${testExt}`);
		}
	}
	return candidates;
};

/** Test files to run: changed tests that still exist, plus existing siblings. */
export const resolveTestFiles = (
	changed: readonly string[],
	exists: (file: string) => boolean
): string[] => {
	const tests = new Set<string>();
	for (const file of changed) {
		if (isInertPath(file)) {
			continue;
		}
		if (isTestFile(file)) {
			if (exists(file)) {
				tests.add(file);
			}
			continue;
		}
		for (const candidate of siblingTestCandidates(file)) {
			if (exists(candidate)) {
				tests.add(candidate);
			}
		}
	}
	return [...tests].sort();
};

export interface TestGroup {
	/** Package dir, or "" for files outside any package (run with `bun test`). */
	dir: string;
	files: string[];
	name: string;
	runner: "bun" | "vitest" | "none";
}

export interface CheckPlan {
	affectedPackages: string[];
	biomeFiles: string[];
	inertOnly: boolean;
	runAllPackages: boolean;
	testGroups: TestGroup[];
}

const ROOT_GROUP = "";

const runnerFor = (pkg: WorkspacePackage | undefined): TestGroup["runner"] => {
	if (!pkg) {
		return "bun";
	}
	return pkg.usesVitest ? "vitest" : "none";
};

export const groupTestsByPackage = (
	tests: readonly string[],
	packages: readonly WorkspacePackage[]
): TestGroup[] => {
	const groups = new Map<string, TestGroup>();
	for (const file of tests) {
		const pkg = findOwningPackage(file, packages);
		const key = pkg?.dir ?? ROOT_GROUP;
		const group = groups.get(key) ?? {
			dir: key,
			files: [],
			name: pkg?.name ?? "(repo root)",
			runner: runnerFor(pkg),
		};
		group.files.push(pkg ? file.slice(pkg.dir.length + 1) : file);
		groups.set(key, group);
	}
	return [...groups.values()].sort((a, b) => a.dir.localeCompare(b.dir));
};

export const planChecks = (
	changed: readonly string[],
	packages: readonly WorkspacePackage[],
	exists: (file: string) => boolean
): CheckPlan => {
	const live = changed.filter(exists);
	const biomeFiles = live.filter(isBiomeSupported);
	const relevant = changed.filter((file) => !isInertPath(file));
	const runAllPackages = relevant.some(isGlobalFile);
	const affected = new Set<string>();
	for (const file of relevant) {
		const pkg = findOwningPackage(file, packages);
		if (pkg) {
			affected.add(pkg.name);
		}
	}
	return {
		affectedPackages: [...affected].sort(),
		biomeFiles,
		inertOnly: changed.length > 0 && relevant.length === 0,
		runAllPackages,
		testGroups: groupTestsByPackage(
			resolveTestFiles(changed, exists),
			packages
		),
	};
};

export const turboArgs = (plan: CheckPlan): string[] | null => {
	if (!plan.runAllPackages && plan.affectedPackages.length === 0) {
		return null;
	}
	const filters = plan.runAllPackages
		? []
		: plan.affectedPackages.map((name) => `--filter=...${name}`);
	return [
		"run",
		"check-types",
		"lint",
		...filters,
		"--continue",
		"--output-logs=errors-only",
		"--ui=stream",
	];
};

const TURBO_FAILED_LINE = /^\s*Failed:\s+(\S+)/;

/** Pulls `pkg#task` names out of turbo's closing "Failed:" lines. */
export const parseTurboFailures = (output: string): string[] => {
	const failures: string[] = [];
	for (const line of output.split("\n")) {
		const match = TURBO_FAILED_LINE.exec(line);
		if (match?.[1]) {
			failures.push(match[1]);
		}
	}
	return failures;
};

// ---------------------------------------------------------------------------
// Git + process plumbing
// ---------------------------------------------------------------------------

export const parseArgs = (
	argv: readonly string[]
): { base?: string; listOnly: boolean } => {
	const baseIndex = argv.indexOf("--base");
	const base = baseIndex === -1 ? undefined : argv[baseIndex + 1];
	if (baseIndex !== -1 && !base) {
		throw new Error("--base needs a git ref, e.g. --base origin/main");
	}
	return { base, listOnly: argv.includes("--list") };
};

const refExists = (ref: string, root: string): boolean => {
	try {
		git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], root);
		return true;
	} catch {
		return false;
	}
};

const resolveBase = (root: string, requested?: string): string => {
	const candidates = requested ? [requested] : DEFAULT_BASE_CANDIDATES;
	for (const ref of candidates) {
		if (refExists(ref, root)) {
			return git(["merge-base", "HEAD", ref], root);
		}
	}
	throw new Error(
		`No base ref found (tried ${candidates.join(", ")}). Pass --base <ref>.`
	);
};

const splitLines = (text: string): string[] =>
	text
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);

/** Committed since base + staged + unstaged (one diff vs. the work tree) + untracked. */
const listChangedFiles = (root: string, base: string): string[] => {
	const tracked = splitLines(git(["diff", "--name-only", base], root));
	const untracked = splitLines(
		git(["ls-files", "--others", "--exclude-standard"], root)
	);
	return [...new Set([...tracked, ...untracked])].sort();
};

interface RunResult {
	code: number;
	output: string;
}

const runCommand = (
	command: string,
	args: readonly string[],
	cwd: string
): Promise<RunResult> =>
	new Promise((resolve) => {
		const child = spawn(command, args, {
			cwd,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let output = "";
		const forward = (chunk: Buffer, sink: NodeJS.WriteStream) => {
			output += chunk.toString();
			sink.write(chunk);
		};
		child.stdout.on("data", (chunk: Buffer) => forward(chunk, process.stdout));
		child.stderr.on("data", (chunk: Buffer) => forward(chunk, process.stderr));
		child.on("error", (error) => resolve({ code: 1, output: String(error) }));
		child.on("close", (code) => resolve({ code: code ?? 1, output }));
	});

interface StepResult {
	detail: string;
	ms: number;
	name: string;
	status: "pass" | "fail" | "skip";
}

const MS_PER_SECOND = 1000;

const formatDuration = (ms: number): string =>
	`${(ms / MS_PER_SECOND).toFixed(1)}s`;

const heading = (text: string) => {
	process.stdout.write(`\n=== ${text}\n`);
};

const timed = async (
	name: string,
	run: () => Promise<Omit<StepResult, "ms" | "name">>
): Promise<StepResult> => {
	heading(name);
	const start = performance.now();
	const result = await run();
	return { ...result, ms: performance.now() - start, name };
};

const skip = (name: string, detail: string): StepResult => ({
	detail,
	ms: 0,
	name,
	status: "skip",
});

const runBiome = (root: string, files: string[]): Promise<StepResult> =>
	timed("biome check (changed files)", async () => {
		const { code } = await runCommand(
			"bunx",
			[
				"biome",
				"check",
				"--no-errors-on-unmatched",
				"--files-ignore-unknown=true",
				...files,
			],
			root
		);
		return {
			detail: `${files.length} file(s)`,
			status: code === 0 ? "pass" : "fail",
		};
	});

const runTurbo = (
	root: string,
	plan: CheckPlan,
	args: string[]
): Promise<StepResult> =>
	timed("turbo check-types + lint (affected + dependents)", async () => {
		const { code, output } = await runCommand("bunx", ["turbo", ...args], root);
		const scope = plan.runAllPackages
			? "all packages (a root config file changed)"
			: plan.affectedPackages.join(", ");
		if (code === 0) {
			return { detail: scope, status: "pass" };
		}
		const failures = parseTurboFailures(output);
		const failed =
			failures.length > 0 ? failures.join(", ") : "see turbo output above";
		return { detail: `${scope}; failed: ${failed}`, status: "fail" };
	});

const testCommand = (group: TestGroup): [string, string[]] =>
	group.runner === "vitest"
		? ["bunx", ["vitest", "run", ...group.files]]
		: ["bun", ["test", ...group.files.map((file) => `./${file}`)]];

const runTestGroup = (root: string, group: TestGroup): Promise<StepResult> => {
	const name = `tests: ${group.name}`;
	if (group.runner === "none") {
		return Promise.resolve(
			skip(name, `no vitest in ${group.dir}/package.json; CI runs its tests`)
		);
	}
	return timed(name, async () => {
		const [command, args] = testCommand(group);
		const { code } = await runCommand(command, args, join(root, group.dir));
		return {
			detail: group.files.join(", "),
			status: code === 0 ? "pass" : "fail",
		};
	});
};

const printPlan = (base: string, changed: string[], plan: CheckPlan) => {
	process.stdout.write(`base: ${base.slice(0, 12)}\n`);
	process.stdout.write(`changed files: ${changed.length}\n`);
	process.stdout.write(`biome files: ${plan.biomeFiles.length}\n`);
	let packagesLine = plan.affectedPackages.join(", ") || "(none)";
	if (plan.runAllPackages) {
		packagesLine = "ALL (root config changed)";
	}
	process.stdout.write(`affected packages: ${packagesLine}\n`);
	const tests = plan.testGroups.flatMap((group) =>
		group.files.map((file) => `${group.dir ? `${group.dir}/` : ""}${file}`)
	);
	process.stdout.write(`sibling tests: ${tests.join(", ") || "(none)"}\n`);
	if (plan.inertOnly) {
		process.stdout.write("only inert paths changed (docs, .agents, *.md)\n");
	}
};

const STATUS_LABEL = { fail: "FAIL", pass: "pass", skip: "skip" } as const;

const printSummary = (steps: StepResult[], totalMs: number) => {
	heading(`summary (${formatDuration(totalMs)})`);
	for (const step of steps) {
		const time = step.status === "skip" ? "" : ` ${formatDuration(step.ms)}`;
		process.stdout.write(
			`  ${STATUS_LABEL[step.status]}${time}  ${step.name}${step.detail ? ` - ${step.detail}` : ""}\n`
		);
	}
	process.stdout.write("\nNot covered locally (CI only):\n");
	for (const item of CI_ONLY) {
		process.stdout.write(`  - ${item}\n`);
	}
};

const main = async (): Promise<number> => {
	const start = performance.now();
	const options = parseArgs(process.argv.slice(2));
	const root = findRepoRoot(process.cwd());
	const base = resolveBase(root, options.base);
	const changed = listChangedFiles(root, base);
	const packages = listWorkspacePackages(root);
	const exists = (file: string) => existsSync(join(root, file));
	const plan = planChecks(changed, packages, exists);

	printPlan(base, changed, plan);
	if (options.listOnly) {
		return 0;
	}
	if (changed.length === 0) {
		process.stdout.write("nothing changed since base\n");
		return 0;
	}

	const steps: StepResult[] = [];
	steps.push(
		plan.biomeFiles.length > 0
			? await runBiome(root, plan.biomeFiles)
			: skip("biome check (changed files)", "no supported files")
	);

	const turbo = turboArgs(plan);
	steps.push(
		turbo
			? await runTurbo(root, plan, turbo)
			: skip("turbo check-types + lint", "no workspace package changed")
	);

	if (plan.testGroups.length === 0) {
		steps.push(skip("tests", "no sibling or changed test files"));
	}
	for (const group of plan.testGroups) {
		// biome-ignore lint/performance/noAwaitInLoops: sequential on purpose so test output does not interleave
		steps.push(await runTestGroup(root, group));
	}

	printSummary(steps, performance.now() - start);
	const failed = steps.some((step) => step.status === "fail");
	process.stdout.write(
		failed ? "\ncheck:changed FAILED\n" : "\ncheck:changed passed\n"
	);
	return failed ? 1 : 0;
};

if (import.meta.main) {
	try {
		process.exitCode = await main();
	} catch (error) {
		process.stderr.write(
			`check:changed: ${error instanceof Error ? error.message : String(error)}\n`
		);
		process.exitCode = 1;
	}
}
