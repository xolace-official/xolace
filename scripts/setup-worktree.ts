/**
 * Idempotent setup for a fresh git worktree. Safe to re-run.
 *
 *   1. Writes `.xolace/setup-running`, then `setup-done` or `setup-failed`.
 *   2. `bun install --frozen-lockfile`.
 *   3. Symlinks gitignored env files (`.env`, `.env.local` at the root and in
 *      every workspace package) from the main worktree when missing here.
 *      Files that pin a Convex deployment, and the backend's `.env.local` (the
 *      Convex CLI writes it), are NOT linked: each worktree needs its own dev
 *      deployment, and a symlink would let the CLI overwrite the main file.
 *   4. Picks stable per-worktree dev ports and writes `.xolace/ports.json`.
 *
 * Usage: bun run setup:worktree [--skip-install]
 */
import { spawnSync } from "node:child_process";
import {
	existsSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

import { findRepoRoot, git, listWorkspacePackages } from "./lib/workspace";

export const STATE_DIR = ".xolace";
const MARKERS = ["setup-running", "setup-done", "setup-failed"] as const;
type Marker = (typeof MARKERS)[number];

export const ENV_FILE_NAMES = [".env", ".env.local"] as const;

/** Default dev ports. The main worktree keeps these exactly. */
export const BASE_PORTS = {
	admin: 3002,
	docs: 4000,
	metro: 8081,
	web: 3001,
} as const;

export type PortName = keyof typeof BASE_PORTS;
export type Ports = Record<PortName, number>;

/**
 * Ports move in steps of 10 so web (3001+10n) and admin (3002+10n) never land
 * on each other across worktrees, and 99 slots keep web/admin below docs (4000).
 */
export const PORT_STRIDE = 10;
export const PORT_SLOTS = 99;

const FNV_OFFSET_BASIS = 0x81_1c_9d_c5;
const FNV_PRIME = 0x01_00_01_93;

const CONVEX_DEPLOYMENT_LINE = /^\s*(export\s+)?CONVEX_DEPLOYMENT\s*=/m;

// ---------------------------------------------------------------------------
// Pure parts (unit-tested in setup-worktree.test.ts)
// ---------------------------------------------------------------------------

/** 32-bit FNV-1a; stable across runs and machines for the same string. */
export const fnv1a = (input: string): number => {
	let hash = FNV_OFFSET_BASIS;
	for (const byte of new TextEncoder().encode(input)) {
		// biome-ignore lint/suspicious/noBitwiseOperators: FNV-1a is defined with xor
		hash ^= byte;
		hash = Math.imul(hash, FNV_PRIME);
	}
	// biome-ignore lint/suspicious/noBitwiseOperators: coerce to unsigned 32-bit
	return hash >>> 0;
};

/** Slot 0 is reserved for the main worktree; others get 1..PORT_SLOTS. */
export const portSlotFor = (worktreePath: string, isMain: boolean): number =>
	isMain ? 0 : 1 + (fnv1a(worktreePath) % PORT_SLOTS);

export const portsForSlot = (slot: number): Ports => ({
	admin: BASE_PORTS.admin + slot * PORT_STRIDE,
	docs: BASE_PORTS.docs + slot * PORT_STRIDE,
	metro: BASE_PORTS.metro + slot * PORT_STRIDE,
	web: BASE_PORTS.web + slot * PORT_STRIDE,
});

/** Every env file path (relative to the repo root) worth linking. */
export const envFileCandidates = (packageDirs: readonly string[]): string[] => {
	const dirs = ["", ...packageDirs];
	return dirs.flatMap((dir) =>
		ENV_FILE_NAMES.map((name) => (dir ? `${dir}/${name}` : name))
	);
};

export type EnvAction =
	| { action: "link"; file: string }
	| { action: "skip"; file: string; reason: string };

export interface EnvFileFacts {
	/** The main worktree's copy sets CONVEX_DEPLOYMENT. */
	definesConvexDeployment: (file: string) => boolean;
	/** Present in the main worktree. */
	inMain: (file: string) => boolean;
	/** Present (file or symlink) in this worktree. */
	inWorktree: (file: string) => boolean;
	/** `.env.local` next to a `convex/` folder: the Convex CLI writes CONVEX_DEPLOYMENT here. */
	isConvexCliFile: (file: string) => boolean;
}

/** Decides, per candidate env file, whether to link it. Missing-in-main files are dropped. */
export const planEnvLinks = (
	candidates: readonly string[],
	facts: EnvFileFacts
): EnvAction[] => {
	const actions: EnvAction[] = [];
	for (const file of candidates) {
		if (!facts.inMain(file)) {
			continue;
		}
		if (facts.inWorktree(file)) {
			actions.push({ action: "skip", file, reason: "already present" });
		} else if (facts.isConvexCliFile(file)) {
			actions.push({
				action: "skip",
				file,
				reason:
					"the Convex CLI writes this file; `convex dev --configure` creates this worktree's own",
			});
		} else if (facts.definesConvexDeployment(file)) {
			actions.push({
				action: "skip",
				file,
				reason:
					"sets CONVEX_DEPLOYMENT; create this worktree's own dev deployment instead",
			});
		} else {
			actions.push({ action: "link", file });
		}
	}
	return actions;
};

export const definesConvexDeployment = (content: string): boolean =>
	CONVEX_DEPLOYMENT_LINE.test(content);

/** First `worktree` entry of `git worktree list --porcelain` is the main checkout. */
export const parseMainWorktree = (porcelain: string): string | undefined => {
	for (const line of porcelain.split("\n")) {
		if (line.startsWith("worktree ")) {
			return line.slice("worktree ".length).trim();
		}
	}
};

// ---------------------------------------------------------------------------
// Side effects
// ---------------------------------------------------------------------------

const log = (message: string) => {
	process.stdout.write(`${message}\n`);
};

const writeMarker = (root: string, marker: Marker, body: string) => {
	const dir = join(root, STATE_DIR);
	mkdirSync(dir, { recursive: true });
	for (const other of MARKERS) {
		rmSync(join(dir, other), { force: true });
	}
	writeFileSync(join(dir, marker), `${new Date().toISOString()}\n${body}\n`);
};

const pathPresent = (path: string): boolean => {
	try {
		lstatSync(path);
		return true;
	} catch {
		return false;
	}
};

const install = (root: string) => {
	log("$ bun install --frozen-lockfile");
	const result = spawnSync("bun", ["install", "--frozen-lockfile"], {
		cwd: root,
		stdio: "inherit",
	});
	if (result.status !== 0) {
		throw new Error(
			"bun install --frozen-lockfile failed (lockfile out of date?)"
		);
	}
};

const linkEnvFiles = (root: string, mainRoot: string) => {
	const packageDirs = listWorkspacePackages(root).map((pkg) => pkg.dir);
	const actions = planEnvLinks(envFileCandidates(packageDirs), {
		definesConvexDeployment: (file) =>
			definesConvexDeployment(readFileSync(join(mainRoot, file), "utf8")),
		inMain: (file) => existsSync(join(mainRoot, file)),
		inWorktree: (file) => pathPresent(join(root, file)),
		isConvexCliFile: (file) =>
			basename(file) === ".env.local" &&
			existsSync(join(root, dirname(file), "convex")),
	});
	if (actions.length === 0) {
		log("env: the main worktree has no .env/.env.local files to link");
	}
	for (const entry of actions) {
		if (entry.action === "skip") {
			log(`env: skip ${entry.file} (${entry.reason})`);
			continue;
		}
		const target = join(mainRoot, entry.file);
		mkdirSync(dirname(join(root, entry.file)), { recursive: true });
		symlinkSync(target, join(root, entry.file));
		log(`env: linked ${entry.file} -> ${target}`);
	}
};

const writePorts = (root: string, isMain: boolean): Ports => {
	const slot = portSlotFor(root, isMain);
	const ports = portsForSlot(slot);
	const body = { ...ports, slot, worktree: root };
	writeFileSync(
		join(root, STATE_DIR, "ports.json"),
		`${JSON.stringify(body, null, "\t")}\n`
	);
	return ports;
};

const printNextSteps = (ports: Ports, isMain: boolean) => {
	log(`\nports (${STATE_DIR}/ports.json):`);
	for (const [name, port] of Object.entries(ports)) {
		log(`  ${name.padEnd(6)} ${port}`);
	}
	log(
		"  e.g. bun run dev:web -- --port <web>   ·   bun run dev:mobile -- --port <metro>"
	);
	if (isMain) {
		return;
	}
	log(
		"\nConvex: this worktree needs its OWN dev deployment. Do not point it at"
	);
	log(
		"another worktree's deployment, and never at prod. When you need a backend:"
	);
	log(
		"  cd packages/backend && bunx convex dev --configure   (choose: new dev deployment)"
	);
	log(
		"Then set *_CONVEX_URL for the apps you run in this worktree. Linked env"
	);
	log("files point at the main worktree's files: replace a link with a copy");
	log("before editing it, or you will edit the main worktree's file.");
};

const main = () => {
	const root = findRepoRoot(process.cwd());
	writeMarker(root, "setup-running", `pid ${process.pid}`);
	try {
		const mainRoot = parseMainWorktree(
			git(["worktree", "list", "--porcelain"], root)
		);
		const isMain = !mainRoot || resolve(mainRoot) === resolve(root);
		if (!process.argv.includes("--skip-install")) {
			install(root);
		}
		if (isMain || !mainRoot) {
			log("env: this is the main worktree; nothing to link");
		} else {
			linkEnvFiles(root, mainRoot);
		}
		const ports = writePorts(root, isMain);
		writeMarker(root, "setup-done", JSON.stringify(ports));
		printNextSteps(ports, isMain);
		log(`\nsetup:worktree done (${STATE_DIR}/setup-done)`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		writeMarker(root, "setup-failed", message);
		process.stderr.write(`setup:worktree failed: ${message}\n`);
		process.exitCode = 1;
	}
};

if (import.meta.main) {
	main();
}
