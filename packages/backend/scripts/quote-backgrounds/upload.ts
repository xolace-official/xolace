// Quote backgrounds upload (B18): makes one deployment's `quote_backgrounds`
// match manifest.json, and puts each loop's files (made by process.ts into
// `media/`, gitignored) in its file storage. Storage ids differ per
// deployment, so each deployment runs it for itself.
//
// Idempotent: a file whose SHA-256 is unchanged isn't re-uploaded, a changed
// one replaces the old blob, and a key dropped from the manifest is retired
// (off the sheet, row kept) rather than deleted. A loop with no files yet gets
// its row, which the app's list leaves out until the video and poster land.
//
// Usage (from packages/backend):
//   bun run quote-backgrounds:upload                  # your dev deployment (.env.local)
//   bun run quote-backgrounds:upload --dry-run        # say what would change
//   bun run quote-backgrounds:upload --only rain-window,hearth
//   bun run quote-backgrounds:upload --no-push        # `convex dev` is already running
//   bun run quote-backgrounds:upload --prod           # release owner only
//   bun run quote-backgrounds:upload --deploy-key     # release owner: staging or a preview
//
// A bare run never reaches prod or staging (../target.ts) and first
// pushes this checkout's functions to your dev deployment. `--prod` and
// `--deploy-key` are the release owner's, run after that deployment is live,
// with the final art only; agents never pass them.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { targetFromArgs } from "../target";
import {
	isRecord,
	LOOP_FILES,
	type LoopFile,
	type ManifestEntry,
	parseManifest,
	pick,
	REQUIRED_LOOP_FILES,
} from "./manifest";

type Live = { active: boolean; key: string } & Partial<
	Record<LoopFile, string>
>;

const HERE = import.meta.dirname;
const MEDIA = path.join(HERE, "media");
const CATALOGUE = "quoteBackgrounds/catalogue";
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const noPush = args.includes("--no-push");
const onlyIndex = args.indexOf("--only");
const only =
	onlyIndex === -1
		? undefined
		: args[onlyIndex + 1]
				?.split(",")
				.map((k) => k.trim())
				.filter(Boolean);

const target = targetFromArgs(args);

function convexRun(fn: string, jsonArgs: Record<string, unknown>): unknown {
	const out = execFileSync(
		"bunx",
		[
			"convex",
			"run",
			`${CATALOGUE}:${fn}`,
			JSON.stringify(jsonArgs),
			...target.convexArgs,
		],
		{ encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
	);
	return out.trim() ? JSON.parse(out) : null;
}

const isLive = (value: unknown): value is Live =>
	isRecord(value) &&
	typeof value.key === "string" &&
	typeof value.active === "boolean";

const sha256 = (bytes: Buffer) =>
	createHash("sha256").update(bytes).digest("hex");

async function put(file: LoopFile, bytes: Buffer): Promise<string> {
	const uploadUrl = convexRun("generateUploadUrl", {});
	const res = await fetch(String(uploadUrl), {
		body: new Uint8Array(bytes),
		headers: { "Content-Type": LOOP_FILES[file].contentType },
		method: "POST",
	});
	if (!res.ok) {
		throw new Error(`${file} upload failed (${res.status})`);
	}
	const body: unknown = await res.json();
	if (!(isRecord(body) && typeof body.storageId === "string")) {
		throw new Error(`${file} upload returned no storageId`);
	}
	return body.storageId;
}

/** The loop's changed files, uploaded: `{ video: { sha256, storageId } … }`. */
async function changedFiles(entry: ManifestEntry, live: Live | undefined) {
	const files: Partial<
		Record<LoopFile, { sha256: string; storageId: string }>
	> = {};
	const notes: string[] = [];
	for (const file of Object.keys(LOOP_FILES) as LoopFile[]) {
		const local = path.join(MEDIA, `${entry.key}.${LOOP_FILES[file].ext}`);
		if (!existsSync(local)) {
			if (REQUIRED_LOOP_FILES.includes(file) && !live?.[file]) {
				notes.push(`no ${file} yet (hidden until it lands)`);
			}
			continue;
		}
		const bytes = readFileSync(local);
		const hash = sha256(bytes);
		if (live?.[file] === hash) {
			continue;
		}
		notes.push(`${file} ${Math.round(bytes.length / 1000)} KB`);
		if (!dryRun) {
			files[file] = { sha256: hash, storageId: await put(file, bytes) };
		}
	}
	return { files, notes };
}

async function uploadOne(
	entry: ManifestEntry,
	order: number,
	live: Live | undefined
) {
	const { files, notes } =
		entry.kind === "loop"
			? await changedFiles(entry, live)
			: { files: {}, notes: [] };
	if (dryRun) {
		return [live ? "would update" : "would insert", ...notes].join(", ");
	}
	const action = convexRun("upsert", {
		...entry,
		active: true,
		order,
		...files,
	});
	return [String(action), ...notes].join(", ");
}

async function main() {
	const manifest = parseManifest(
		JSON.parse(readFileSync(path.join(HERE, "manifest.json"), "utf8"))
	);
	const chosen = pick(manifest, only);
	console.log(
		`${dryRun ? "Checking" : "Uploading"} quote backgrounds on ${target.label}`
	);
	if (target.pushFunctions && !(dryRun || noPush)) {
		execFileSync("bunx", ["convex", "dev", "--once"], { stdio: "inherit" });
	}
	const rows = convexRun("listForUpload", {});
	if (!(Array.isArray(rows) && rows.every(isLive))) {
		throw new Error("listForUpload returned an unexpected shape");
	}
	const live = new Map(rows.map((row) => [row.key, row]));

	let failures = 0;
	for (const entry of chosen) {
		try {
			const order = manifest.indexOf(entry);
			console.log(
				`${entry.key}: ${await uploadOne(entry, order, live.get(entry.key))}`
			);
		} catch (err) {
			failures++;
			console.error(
				`${entry.key}: FAILED — ${err instanceof Error ? err.message : String(err)}`
			);
		}
	}
	if (!only) {
		const listed = new Set(manifest.map((e) => e.key));
		for (const row of rows.filter((r) => r.active && !listed.has(r.key))) {
			if (!dryRun) {
				convexRun("retire", { key: row.key });
			}
			console.log(
				`${row.key}: ${dryRun ? "would retire" : "retired"} (not in the manifest)`
			);
		}
	}
	if (failures > 0) {
		process.exit(1);
	}
}

await main();
