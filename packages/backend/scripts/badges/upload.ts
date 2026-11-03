// Badge art upload (#690): cuts each approved badge out and fills `badge_art`
// in one deployment. Storage ids differ per deployment, so every deployment
// runs it for itself. Idempotent: an image whose WebP is unchanged isn't
// re-uploaded, and a changed one replaces its row (the old image is deleted).
//
// `manifest.json` beside this file records the approved generation per artKey
// (`{ artKey, source, generationId }`, see manifest.ts); the sources (2K PNGs
// from the ElevenLabs flow) live in `media/`, gitignored like the Kindling
// media. Streak rungs that share a stage share a source: the cut-out adds
// their pips (see cut.ts). An artKey with no entry shows the `fallback` image,
// locked, until one is added.
//
// Usage (from packages/backend):
//   bun run badges:upload                     # your dev deployment (.env.local)
//   bun run badges:upload --dry-run --out tmp # cut only, write the WebPs to tmp/
//   bun run badges:upload --only joined,streak-spark-2
//   bun run badges:upload --prod              # release owner only
//   bun run badges:upload --deploy-key        # release owner: staging or a preview
//
// A bare run never reaches prod or staging (target.ts) and first pushes this
// checkout's functions to your dev deployment (`convex dev --once`), so
// `badge_art` exists there. `--prod` / `--deploy-key` are the release owner's,
// run after that deployment is live; agents never pass them. Drives Convex via
// the local `convex` CLI and its existing login.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { BADGE_ART_KEYS } from "../../convex/achievements/catalog";
import { cutBadge, encodeBadge, markerFor, thumbhashOf } from "./cut";
import { isRecord, type ManifestEntry, parseManifest } from "./manifest";
import { resolveTarget } from "./target";

type LiveArt = { artKey: string; sha256: string };

const HERE = import.meta.dirname;
const args = process.argv.slice(2);
const flag = (name: string) => {
	const i = args.indexOf(`--${name}`);
	return i === -1 ? undefined : args[i + 1];
};
const dryRun = args.includes("--dry-run");
const outDir = flag("out");
const only = flag("only")
	?.split(",")
	.map((key) => key.trim())
	.filter(Boolean);

const envLocalPath = path.join(HERE, "../../.env.local");
const target = resolveTarget(
	args,
	process.env,
	existsSync(envLocalPath) ? parseEnv(readFileSync(envLocalPath, "utf8")) : {}
);

function convexRun(fn: string, jsonArgs: Record<string, unknown>): unknown {
	const out = execFileSync(
		"bunx",
		["convex", "run", fn, JSON.stringify(jsonArgs), ...target.convexArgs],
		{ encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
	);
	return out.trim() ? JSON.parse(out) : null;
}

const isLiveArt = (value: unknown): value is LiveArt =>
	isRecord(value) &&
	typeof value.artKey === "string" &&
	typeof value.sha256 === "string";

const messageOf = (err: unknown) =>
	err instanceof Error ? err.message : String(err);

function readManifest(): ManifestEntry[] {
	const manifest = parseManifest(
		JSON.parse(readFileSync(path.join(HERE, "manifest.json"), "utf8"))
	);
	const listed = new Set(manifest.map((e) => e.artKey));
	const unknown = (only ?? []).filter((key) => !listed.has(key));
	if (unknown.length > 0) {
		throw new Error(`--only: not in the manifest: ${unknown.join(", ")}`);
	}
	return only ? manifest.filter((e) => only.includes(e.artKey)) : manifest;
}

async function prepare({ artKey, source }: ManifestEntry) {
	const png = readFileSync(path.join(HERE, "media", source));
	const webp = await encodeBadge(await cutBadge(png, markerFor(artKey)));
	return {
		sha256: createHash("sha256").update(webp).digest("hex"),
		thumbhash: await thumbhashOf(webp),
		webp,
	};
}

async function uploadOne(
	entry: ManifestEntry,
	liveSha: ReadonlyMap<string, string>
): Promise<string> {
	const { sha256, thumbhash, webp } = await prepare(entry);
	if (outDir) {
		mkdirSync(outDir, { recursive: true });
		writeFileSync(path.join(outDir, `${entry.artKey}.webp`), webp);
	}
	if (dryRun) {
		return `cut (${webp.length} bytes)`;
	}
	if (liveSha.get(entry.artKey) === sha256) {
		return "unchanged";
	}
	const uploadUrl = convexRun("achievements/art:generateUploadUrl", {});
	const res = await fetch(String(uploadUrl), {
		body: new Uint8Array(webp),
		headers: { "Content-Type": "image/webp" },
		method: "POST",
	});
	if (!res.ok) {
		throw new Error(`upload failed (${res.status})`);
	}
	const body: unknown = await res.json();
	const storageId = isRecord(body) ? body.storageId : undefined;
	if (typeof storageId !== "string") {
		throw new Error("upload returned no storageId");
	}
	const action = convexRun("achievements/art:upsertArt", {
		artKey: entry.artKey,
		sha256,
		storageId,
		thumbhash,
	});
	return `${action} (${webp.length} bytes)`;
}

async function main() {
	const manifest = readManifest();
	if (!dryRun) {
		console.log(`Uploading badge art to ${target.label}`);
		if (target.pushFunctions) {
			execFileSync("bunx", ["convex", "dev", "--once"], { stdio: "inherit" });
		}
	}
	const live = dryRun ? [] : convexRun("achievements/art:listArt", {});
	if (!(Array.isArray(live) && live.every(isLiveArt))) {
		throw new Error("listArt returned an unexpected shape");
	}
	const liveSha = new Map(live.map((row) => [row.artKey, row.sha256]));

	let failures = 0;
	for (const entry of manifest) {
		try {
			console.log(`${entry.artKey}: ${await uploadOne(entry, liveSha)}`);
		} catch (err) {
			failures++;
			console.error(`${entry.artKey}: FAILED — ${messageOf(err)}`);
		}
	}
	const listed = new Set(manifest.map((e) => e.artKey));
	const missing = BADGE_ART_KEYS.filter((key) => !listed.has(key));
	if (!only && missing.length > 0) {
		console.log(
			`\n${missing.length} artKey(s) have no approved image yet and show the fallback.`
		);
	}
	if (failures > 0) {
		process.exit(1);
	}
}

await main();
