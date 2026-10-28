// Curate music-track tags (#365, parent #363).
//
// One-off content-authoring pass: for every music track in a manifest, asks
// the LLM to pick the fitting words from the music racks' vocabulary
// (catalog.ts CatalogEntry.emotions ∪ themes): its own topic's words first,
// then any other music topic's that what it sounds like clearly fits — never
// free-form invention. The raw Pixabay tags move to
// `sourceTags` (lossless); the LLM's pick becomes the new curated `tags`,
// which is what the binder (bind.ts) actually scores against.
//
// This is a one-time pass over static manifest JSON — it does not touch the
// Convex database. Run `bun scripts/kindling/ingest.ts` (dev only) afterwards
// to verify the updated shape end-to-end; the `--prod` ingest stays a manual,
// human-run step (see ingest.ts header).
//
// Usage:
//   bun scripts/kindling/curate-tags.ts                # dev/manifest.json
//   bun scripts/kindling/curate-tags.ts --prod          # prod/manifest.json
//   bun scripts/kindling/curate-tags.ts --manifest path/to/manifest.json
//
// Idempotent by default: a track that already has `sourceTags` is treated as
// already curated and skipped. Pass --force to re-curate every track anyway,
// or --moved for just the tracks whose topic changed since their listening
// review (`what-its-for.review.json`), whose old tags came from the old rack,
// plus any track still without a tag. --slugs a,b re-curates just those.
// Where a review exists, the model also reads what the track sounds like.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CATALOG, CATALOG_BY_KEY } from "../../convex/ai/paths/catalog";
import {
	CLASSIFIER_MODEL,
	extractTextFromResponse,
	getAnthropicClient,
	thinkingOff,
} from "../../convex/ai/providers/anthropic";

type ManifestTrack = {
	slug: string;
	family: "support" | "music";
	title: string;
	topic: string;
	tags: string[];
	sourceTags?: string[];
	[key: string]: unknown;
};

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
	const i = args.indexOf(`--${name}`);
	return i === -1 ? fallback : args[i + 1];
};
const prod = args.includes("--prod");
const force = args.includes("--force");
const moved = args.includes("--moved");
const only = new Set(
	args.includes("--slugs") ? flag("slugs", "").split(",") : []
);
const manifestPath = path.resolve(
	flag("manifest", `scripts/kindling/${prod ? "prod" : "dev"}/manifest.json`)
);
type Review = { heard: string; topic: string; whatItsFor: string };
const reviewPath = path.join(
	path.dirname(manifestPath),
	"what-its-for.review.json"
);
const reviews: Record<string, Review> = existsSync(reviewPath)
	? JSON.parse(readFileSync(reviewPath, "utf8"))
	: {};
const CONCURRENCY = 5;

function vocabFor(topic: string): string[] {
	const entry = CATALOG_BY_KEY.get(topic);
	if (!entry) {
		throw new Error(`no catalog entry for topic "${topic}"`);
	}
	return [...new Set([...entry.emotions, ...entry.themes])];
}

/** Every music topic's words: a track may carry another topic's when it fits. */
const MUSIC_VOCAB = new Set(
	CATALOG.filter((e) => e.actionType.startsWith("music_topic_")).flatMap(
		(e) => [...e.emotions, ...e.themes]
	)
);

/**
 * Returns null on unparseable model output — distinct from a genuine, valid empty pick.
 * Reads the last complete array: the model sometimes corrects its first pick in prose.
 */
function parseTagArray(raw: string, vocab: Set<string>): string[] | null {
	const match = raw.match(/\[[^[\]]*\]/g)?.at(-1);
	if (!match) {
		return null;
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(match);
	} catch {
		return null;
	}
	if (!Array.isArray(parsed)) {
		return null;
	}
	return parsed.filter(
		(v): v is string => typeof v === "string" && vocab.has(v)
	);
}

async function curateOne(track: ManifestTrack): Promise<string[]> {
	const vocab = vocabFor(track.topic);
	const others = [...MUSIC_VOCAB].filter((w) => !vocab.includes(w));
	const rawTags = track.sourceTags ?? track.tags;
	const review = reviews[track.slug];
	const heard = review
		? `\nWhat it sounds like: ${review.heard}\nWhat it's for: ${review.whatItsFor}`
		: "";

	const response = await getAnthropicClient().messages.create({
		max_tokens: 200,
		messages: [
			{
				content: `Title: ${track.title}\nRaw tags: ${JSON.stringify(rawTags)}${heard}`,
				role: "user",
			},
		],
		model: CLASSIFIER_MODEL,
		system:
			"You curate mood/theme tags for music tracks in a mental-health app. " +
			"Given a track's title, its raw source tags and, when given, what it sounds like, pick the " +
			"words below that genuinely fit how the track feels and what a listener might be going " +
			"through when it helps. Prefer the TOPIC words; add an OTHER word only when the track " +
			"clearly fits it. Pick 2 to 5 words. Only choose words from these two lists — never " +
			"invent a new word. Return ONLY a JSON array of strings, no prose.\n\nTOPIC words: " +
			JSON.stringify(vocab) +
			"\nOTHER words: " +
			JSON.stringify(others),
		thinking: thinkingOff(CLASSIFIER_MODEL),
	});

	const text = extractTextFromResponse(response);
	const tags = parseTagArray(text, MUSIC_VOCAB);
	if (tags === null) {
		throw new Error(`could not parse a tag array from: ${text.slice(0, 200)}`);
	}
	return tags;
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
	const musicTracks = manifest.filter((t) => t.family === "music");
	// Idempotent by default: a track with `sourceTags` already set has already
	// been curated by a prior run — skip it so a retry after a partial failure
	// doesn't re-spend API calls or risk the (non-deterministic) model
	// flip-flopping tags that already landed. --force re-curates everyone.
	const toCurate =
		only.size > 0
			? musicTracks.filter((t) => only.has(t.slug))
			: force
				? musicTracks
				: musicTracks.filter(
						(t) =>
							t.sourceTags === undefined ||
							(moved &&
								(t.tags.length === 0 ||
									(reviews[t.slug] !== undefined &&
										`music_topic_${reviews[t.slug].topic}` !== t.topic)))
					);
	const skipped = musicTracks.length - toCurate.length;
	if (skipped > 0) {
		console.log(
			`Skipping ${skipped} already-curated track(s) (pass --force to re-curate)`
		);
	}

	let failures = 0;
	await pool(toCurate, CONCURRENCY, async (track) => {
		try {
			const curated = await curateOne(track);
			track.sourceTags ??= track.tags;
			track.tags = curated;
			console.log(`${track.slug}: ${JSON.stringify(curated)}`);
		} catch (err) {
			failures++;
			console.error(`${track.slug}: FAILED — ${(err as Error).message}`);
		}
	});

	// Self-check (per #363 testing decisions): every written tag must be a
	// music rack word — no free-form invention.
	for (const track of musicTracks) {
		for (const tag of track.tags) {
			if (!MUSIC_VOCAB.has(tag)) {
				throw new Error(
					`self-check failed: "${track.slug}" has tag "${tag}" outside the music racks' vocabulary`
				);
			}
		}
	}

	writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
	console.log(
		`Curated ${toCurate.length - failures}/${toCurate.length} music tracks in ${manifestPath}`
	);
	if (failures > 0) {
		process.exit(1);
	}
}

main();
