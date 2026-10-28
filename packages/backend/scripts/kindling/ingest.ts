// Kindling catalogue ingestion (#328, docs/paths-v1.md §3.4).
//
// Uploads local audio + thumbnail files to R2 and upserts their rows into
// `audio_tracks`. Idempotent — safe to re-run the whole manifest.
//
// Topic art (#354): `topics.json` beside the manifest holds
// `[{ slug, title?, thumbPath }]` and is ingested as a first pass into
// `topics` via `upsertTopic`. Covers go through the same WebP pipeline as
// track thumbs (below) and share the content-addressed `thumb/<sha>.webp`
// key space. A cover whose key already backs the slug's
// row is not re-uploaded, so a title-only edit is cheap; an unknown slug is
// rejected by the mutation and leaves no row or blob behind.
//
// Dev fixtures (scripts/kindling/dev/) and the real curated catalogue
// (scripts/kindling/prod/, ~400 tracks) are separate manifest+topics+media
// trees — never one set uploaded to two deployments. `--prod` targets the
// prod Convex deployment/bucket AND defaults manifest/media to the prod/
// tree, so a bare `--prod` can't accidentally push the tiny dev fixture set
// as if it were the real catalogue. Pass `--manifest`/`--media` explicitly
// to override either side independently.
//
// Usage:
//   bun scripts/kindling/ingest.ts --update-hashes   # fill in audio sha256 fields from local files
//   bun scripts/kindling/ingest.ts --update-hashes --prod (or --manifest scripts/kindling/prod/manifest.json explicitly)
//   bun scripts/kindling/ingest.ts                    # dev deployment + dev/ fixtures
//   bun scripts/kindling/ingest.ts --prod             # prod deployment + prod/ curated catalogue
//   bun scripts/kindling/ingest.ts --manifest scripts/kindling/dev/manifest.json   # topics.json is read from the same dir
//
//   bun scripts/kindling/ingest.ts --thumbs-only [--prod]   # re-upload thumbs only, no audio
//
// Thumbnails are never uploaded as-is: each source is resized to a 1080px
// WebP (sharp: lanczos3, q78, effort 6 — the library cover settings) and
// keyed by the WebP's hash; that hash is the row's `thumbSha256` (manifests
// carry no thumb hash — a stale one in old JSON is overwritten). A base64
// ThumbHash of it is stored on the row for the blurred placeholder.
// The first full run after switching to WebP reports unchanged-audio tracks
// as "updated" (stored source hash ≠ WebP hash); so does a sharp/libvips
// upgrade that changes the encoder's output. 1080 covers the widest use (the hub hero);
// 4375² sources made every Browse row decode ~19MP. `--thumbs-only` swaps
// thumbs on existing rows without the audio re-upload a full run does.
//
// Drives Convex via the local `convex` CLI (reuses your existing CLI login — no new secret).

import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { rgbaToThumbHash } from "thumbhash";

type SharedFields = {
	slug: string;
	title: string;
	topic: string;
	tags: string[];
	audioPath: string;
	thumbPath: string;
	durationSec: number;
	sha256: string;
	newUntil?: number;
};
type SupportTrack = SharedFields & {
	family: "support";
	narrators?: string[];
	series?: string;
	seriesTitle?: string;
	episodeNumber?: number;
	tier?: number;
	safetyReviewedAt?: number;
	transcript?: string; // the meaning index embeds it (#572)
};
type MusicTrack = SharedFields & {
	family: "music";
	licence: Record<string, unknown>;
	secondaryTopic?: string; // another music_topic_* it also lists under in Browse
	sound?: Record<string, unknown>; // what a listening review heard (describe-music.ts)
	whatItsFor?: string; // one line, embedded with title + tags (#572)
};
type ManifestTrack = SupportTrack | MusicTrack;
type ManifestTopic = { slug: string; title?: string; thumbPath: string };

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
	const i = args.indexOf(`--${name}`);
	return i === -1 ? fallback : args[i + 1];
};
const prod = args.includes("--prod");
const updateHashes = args.includes("--update-hashes");
const thumbsOnly = args.includes("--thumbs-only");
const THUMB_PX = 1080;
const catalogueDir = prod ? "prod" : "dev";
const manifestPath = path.resolve(
	flag("manifest", `scripts/kindling/${catalogueDir}/manifest.json`)
);
const topicsPath = path.join(path.dirname(manifestPath), "topics.json");
const mediaDir = path.resolve(
	flag("media", `scripts/kindling/${catalogueDir}/media`)
);
const CONCURRENCY = 5;
const UPLOAD_TIMEOUT_MS = 10 * 60_000; // audio files can be tens of MB

function sha256File(filePath: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const hash = createHash("sha256");
		createReadStream(filePath)
			.on("data", (chunk) => hash.update(chunk))
			.on("error", reject)
			.on("end", () => resolve(hash.digest("hex")));
	});
}

function convexRun(fn: string, jsonArgs: unknown): any {
	const out = execFileSync(
		"npx",
		[
			"convex",
			"run",
			fn,
			JSON.stringify(jsonArgs),
			...(prod ? ["--prod"] : []),
		],
		{ encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
	);
	// A `null` return prints nothing.
	return out.trim() ? JSON.parse(out) : null;
}

function ext(filePath: string): string {
	return path.extname(filePath).slice(1);
}

type Thumb = { key: string; sha256: string; thumbhash: string; file: Buffer };

// Resized WebP + ThumbHash of a source thumb, memoised by path: shared art
// is processed once and every entry using it gets the same key.
const thumbs = new Map<string, Promise<Thumb>>();
// Which source made each WebP, noted in one call after every thumb is made.
const sourcePairs: { sourceSha256: string; webpSha256: string }[] = [];
function thumbOf(thumbPath: string): Promise<Thumb> {
	let thumb = thumbs.get(thumbPath);
	if (!thumb) {
		thumb = (async () => {
			const source = readFileSync(path.resolve(mediaDir, thumbPath));
			const file = await sharp(source)
				.resize(THUMB_PX, THUMB_PX, {
					fit: "inside",
					kernel: "lanczos3",
					withoutEnlargement: true,
				})
				.webp({ effort: 6, quality: 78 })
				.toBuffer();
			// ThumbHash encodes at most 100×100 RGBA.
			const { data, info } = await sharp(file)
				.resize(100, 100, { fit: "inside" })
				.ensureAlpha()
				.raw()
				.toBuffer({ resolveWithObject: true });
			const sha256 = createHash("sha256").update(file).digest("hex");
			// So an admin import of this same source keeps this WebP rather than
			// re-encoding it (convex/imports/imageSources.ts). Sent once, in main.
			sourcePairs.push({
				sourceSha256: createHash("sha256").update(source).digest("hex"),
				webpSha256: sha256,
			});
			const thumbhash = Buffer.from(
				rgbaToThumbHash(info.width, info.height, data)
			).toString("base64");
			return { file, key: `thumb/${sha256}.webp`, sha256, thumbhash };
		})();
		thumbs.set(thumbPath, thumb);
	}
	return thumb;
}

async function putFile(url: string, filePath: string | Buffer): Promise<void> {
	const res = await fetch(url, {
		body: new Uint8Array(
			typeof filePath === "string" ? readFileSync(filePath) : filePath
		),
		method: "PUT",
		signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
	});
	if (!res.ok) {
		throw new Error(
			`upload failed (${res.status})${typeof filePath === "string" ? `: ${filePath}` : ""}`
		);
	}
}

async function ingestOne(
	track: ManifestTrack,
	sharedThumbKeys: Set<string>
): Promise<void> {
	if (
		track.family === "support" &&
		(track.tier ?? 0) >= 3 &&
		!track.safetyReviewedAt
	) {
		throw new Error(`tier ${track.tier} requires safetyReviewedAt`);
	}

	// Thumb before audio (docs/paths-v1.md §3.4 step 2): if the run dies
	// mid-track, a row is never created pointing at a missing thumbnail.
	const thumb = await thumbOf(track.thumbPath);
	const thumbKey = thumb.key;
	const audioKey = `${track.family}/${track.slug}/${randomUUID()}.${ext(track.audioPath)}`;
	try {
		const thumbUpload = convexRun("ai/paths/audioTracks:mintUploadUrl", {
			key: thumbKey,
		});
		await putFile(thumbUpload.url, thumb.file);

		if (thumbsOnly) {
			convexRun("ai/paths/audioTracks:setTrackThumb", {
				slug: track.slug,
				thumbhash: thumb.thumbhash,
				thumbKey,
				thumbSha256: thumb.sha256,
			});
			console.log(
				`${track.slug}: thumb ${thumbKey} (${thumb.file.length} bytes)`
			);
			return;
		}

		const audioUpload = convexRun("ai/paths/audioTracks:mintUploadUrl", {
			key: audioKey,
		});
		await putFile(audioUpload.url, path.resolve(mediaDir, track.audioPath));

		const { audioPath: _audioPath, thumbPath: _thumbPath, ...rest } = track;
		const result = convexRun("ai/paths/audioTracks:upsertTrack", {
			track: {
				...rest,
				key: audioUpload.key,
				thumbhash: thumb.thumbhash,
				thumbKey: thumbUpload.key,
				thumbSha256: thumb.sha256,
			},
		});
		console.log(`${track.slug}: ${result.action}`);
	} catch (err) {
		// Blobs from this attempt are orphans; deleting a key that was never
		// uploaded is a no-op. A thumbKey shared with another manifest entry is
		// left alone — a concurrent worker may be mid-upload to it and not yet
		// have a row referencing it, so deleting here would race it (#354);
		// an unreferenced shared blob is a harmless orphan for GC, not a bug.
		try {
			convexRun("ai/paths/audioTracks:discardUpload", {
				audioKey: thumbsOnly ? undefined : audioKey,
				thumbKey: sharedThumbKeys.has(thumbKey) ? undefined : thumbKey,
			});
		} catch (cleanupErr) {
			console.error(
				`${track.slug}: cleanup failed — ${(cleanupErr as Error).message}`
			);
		}
		throw err;
	}
}

async function ingestTopic(
	topic: ManifestTopic,
	liveThumbKeys: Record<string, string>,
	sharedThumbKeys: Set<string>
): Promise<void> {
	const thumb = await thumbOf(topic.thumbPath);
	const thumbKey = thumb.key;
	const uploaded = liveThumbKeys[topic.slug] !== thumbKey;
	try {
		if (uploaded) {
			const upload = convexRun("ai/paths/audioTracks:mintUploadUrl", {
				key: thumbKey,
			});
			await putFile(upload.url, thumb.file);
		}
		const { thumbPath: _thumbPath, ...rest } = topic;
		const result = convexRun("ai/paths/audioTracks:upsertTopic", {
			topic: {
				...rest,
				thumbhash: thumb.thumbhash,
				thumbKey,
				thumbSha256: thumb.sha256,
			},
		});
		console.log(`topic ${topic.slug}: ${result.action}`);
	} catch (err) {
		if (!uploaded) {
			throw err;
		}
		// See the matching comment in ingestOne — don't race a concurrent
		// worker uploading to the same content-addressed key.
		if (!sharedThumbKeys.has(thumbKey)) {
			try {
				convexRun("ai/paths/audioTracks:discardUpload", { thumbKey });
			} catch (cleanupErr) {
				console.error(
					`topic ${topic.slug}: cleanup failed — ${(cleanupErr as Error).message}`
				);
			}
		}
		throw err;
	}
}

async function pool<T>(
	items: T[],
	limit: number,
	worker: (item: T) => Promise<void>
): Promise<void> {
	const queue = [...items];
	await Promise.all(
		Array.from({ length: limit }, async () => {
			let item: T | undefined;
			while ((item = queue.shift())) {
				await worker(item);
			}
		})
	);
}

async function main() {
	const manifest: ManifestTrack[] = JSON.parse(
		readFileSync(manifestPath, "utf8")
	);
	const topics: ManifestTopic[] = JSON.parse(readFileSync(topicsPath, "utf8"));

	if (updateHashes) {
		for (const track of manifest) {
			track.sha256 = await sha256File(path.resolve(mediaDir, track.audioPath));
		}
		writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
		console.log(`Updated hashes for ${manifest.length} tracks`);
		return;
	}

	if (!prod) {
		execFileSync("npx", ["convex", "dev", "--once"], { stdio: "inherit" });
	}

	// A thumbKey used by >1 manifest/topic entry may have concurrent workers
	// uploading to it at once; cleanup must never delete those (#354 race).
	const thumbKeyCounts = new Map<string, number>();
	for (const entry of [...manifest, ...topics]) {
		let key: string;
		try {
			key = (await thumbOf(entry.thumbPath)).key;
		} catch {
			// Missing/unreadable thumb: the memoised rejection fails just this
			// entry in ingestOne/ingestTopic, before anything is uploaded.
			continue;
		}
		thumbKeyCounts.set(key, (thumbKeyCounts.get(key) ?? 0) + 1);
	}
	const sharedThumbKeys = new Set(
		[...thumbKeyCounts].filter(([, count]) => count > 1).map(([key]) => key)
	);
	// Only spares a later admin import a re-encode, so a failure warns and the
	// ingest goes on.
	if (sourcePairs.length > 0) {
		try {
			convexRun("imports/imageSources:note", { pairs: sourcePairs });
		} catch (err) {
			console.warn(`Image sources not noted: ${(err as Error).message}`);
		}
	}

	let failures = 0;
	const liveThumbKeys = convexRun(
		"ai/paths/audioTracks:listTopicThumbKeys",
		{}
	);
	await pool(topics, CONCURRENCY, async (topic) => {
		try {
			await ingestTopic(topic, liveThumbKeys, sharedThumbKeys);
		} catch (err) {
			failures++;
			console.error(`topic ${topic.slug}: FAILED — ${(err as Error).message}`);
		}
	});
	await pool(manifest, CONCURRENCY, async (track) => {
		try {
			await ingestOne(track, sharedThumbKeys);
		} catch (err) {
			failures++;
			console.error(`${track.slug}: FAILED — ${(err as Error).message}`);
		}
	});
	if (failures > 0) {
		process.exit(1);
	}
}

main();
