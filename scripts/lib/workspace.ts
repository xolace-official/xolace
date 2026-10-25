import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface WorkspacePackage {
	/** Directory relative to the repo root, POSIX separators, no trailing slash. */
	dir: string;
	/** Package name from its package.json, e.g. `@xolace/web`. */
	name: string;
	/** Whether vitest is a direct dependency (decides how sibling tests run). */
	usesVitest: boolean;
}

interface PackageJson {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	name?: string;
	workspaces?: string[] | { packages?: string[] };
}

const TRAILING_WILDCARD = /\/\*$/;

const readPackageJson = (path: string): PackageJson =>
	JSON.parse(readFileSync(path, "utf8")) as PackageJson;

/** The workspace globs from the root package.json (`apps/*`, `packages/*`). */
export const readWorkspaceGlobs = (root: string): string[] => {
	const { workspaces } = readPackageJson(join(root, "package.json"));
	if (Array.isArray(workspaces)) {
		return workspaces;
	}
	return workspaces?.packages ?? [];
};

/**
 * Expands workspace globs into candidate directories. Only the two shapes this
 * repo uses are supported: `parent/*` and a literal directory.
 */
export const expandWorkspaceGlob = (
	root: string,
	pattern: string
): string[] => {
	if (!TRAILING_WILDCARD.test(pattern)) {
		return [pattern];
	}
	const parent = pattern.replace(TRAILING_WILDCARD, "");
	if (!existsSync(join(root, parent))) {
		return [];
	}
	return readdirSync(join(root, parent), { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => `${parent}/${entry.name}`);
};

/** Expands the root workspace globs into the packages that exist on disk. */
export const listWorkspacePackages = (root: string): WorkspacePackage[] => {
	const packages: WorkspacePackage[] = [];
	for (const pattern of readWorkspaceGlobs(root)) {
		for (const dir of expandWorkspaceGlob(root, pattern)) {
			const manifestPath = join(root, dir, "package.json");
			if (!existsSync(manifestPath)) {
				continue;
			}
			const manifest = readPackageJson(manifestPath);
			const deps = { ...manifest.dependencies, ...manifest.devDependencies };
			packages.push({
				dir,
				name: manifest.name ?? dir,
				usesVitest: "vitest" in deps,
			});
		}
	}
	return packages.sort((a, b) => a.dir.localeCompare(b.dir));
};

/** Synchronous git helper; returns trimmed stdout or throws with stderr. */
export const git = (args: string[], cwd: string): string => {
	const result = spawnSync("git", args, { cwd, encoding: "utf8" });
	if (result.status !== 0) {
		throw new Error(`git ${args.join(" ")} failed: ${result.stderr.trim()}`);
	}
	return result.stdout.trim();
};

/** Root of the git worktree that contains `cwd`. */
export const findRepoRoot = (cwd: string): string =>
	git(["rev-parse", "--show-toplevel"], cwd);
