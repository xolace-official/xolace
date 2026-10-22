// Curate music-track tags (#365, parent #363).
//
// One-off content-authoring pass: for every music track in a manifest, asks
// the LLM to pick the fitting subset of that track's OWN rack vocabulary
// (catalog.ts CatalogEntry.emotions ∪ themes for its topic) — never a global
// taxonomy, never free-form invention. The raw Pixabay tags move to
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
// already curated and skipped. Pass --force to re-curate every track anyway.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CATALOG_BY_KEY } from "../../convex/ai/paths/catalog";
import { CLASSIFIER_MODEL, extractTextFromResponse, getAnthropicClient, thinkingOff } from "../../convex/ai/providers/anthropic";

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
const manifestPath = path.resolve(
  flag("manifest", `scripts/kindling/${prod ? "prod" : "dev"}/manifest.json`),
);
const CONCURRENCY = 5;

function vocabFor(topic: string): string[] {
  const entry = CATALOG_BY_KEY.get(topic);
  if (!entry) throw new Error(`no catalog entry for topic "${topic}"`);
  return [...new Set([...entry.emotions, ...entry.themes])];
}

/** Returns null on unparseable model output — distinct from a genuine, valid empty pick. */
function parseTagArray(raw: string, vocab: Set<string>): string[] | null {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  return parsed.filter((v): v is string => typeof v === "string" && vocab.has(v));
}

async function curateOne(track: ManifestTrack): Promise<string[]> {
  const vocab = vocabFor(track.topic);
  const vocabSet = new Set(vocab);
  const rawTags = track.sourceTags ?? track.tags;

  const response = await getAnthropicClient().messages.create({
    model: CLASSIFIER_MODEL,
    max_tokens: 200,
    thinking: thinkingOff(CLASSIFIER_MODEL),
    system:
      "You curate mood/theme tags for instrumental music tracks in a mental-health app. " +
      "Given a track's title and its raw source tags, pick the subset of the CANDIDATE " +
      "list below that genuinely fits the track. Only choose words from the candidate " +
      "list — never invent a new word. Return ONLY a JSON array of strings (0 or more), " +
      "no prose.\n\nCandidate list: " +
      JSON.stringify(vocab),
    messages: [
      {
        role: "user",
        content: `Title: ${track.title}\nRaw tags: ${JSON.stringify(rawTags)}`,
      },
    ],
  });

  const tags = parseTagArray(extractTextFromResponse(response), vocabSet);
  if (tags === null) throw new Error("could not parse a tag array from the model response");
  return tags;
}

async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: limit }, async () => {
      let item: T | undefined;
      while ((item = queue.shift())) await worker(item);
    }),
  );
}

async function main() {
  const manifest: ManifestTrack[] = JSON.parse(readFileSync(manifestPath, "utf8"));
  const musicTracks = manifest.filter((t) => t.family === "music");
  // Idempotent by default: a track with `sourceTags` already set has already
  // been curated by a prior run — skip it so a retry after a partial failure
  // doesn't re-spend API calls or risk the (non-deterministic) model
  // flip-flopping tags that already landed. --force re-curates everyone.
  const toCurate = force ? musicTracks : musicTracks.filter((t) => t.sourceTags === undefined);
  const skipped = musicTracks.length - toCurate.length;
  if (skipped > 0) console.log(`Skipping ${skipped} already-curated track(s) (pass --force to re-curate)`);

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
  // member of its own track's rack vocabulary — no cross-rack leakage, no
  // free-form invention.
  for (const track of musicTracks) {
    const vocab = new Set(vocabFor(track.topic));
    for (const tag of track.tags) {
      if (!vocab.has(tag)) {
        throw new Error(`self-check failed: "${track.slug}" has tag "${tag}" outside its rack vocabulary`);
      }
    }
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Curated ${toCurate.length - failures}/${toCurate.length} music tracks in ${manifestPath}`);
  if (failures > 0) process.exit(1);
}

main();
