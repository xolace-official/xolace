// Library catalogue ingestion (#406, decisions in #392).
//
// Upserts `sources.json` → `manifest.json` (entries) → `hubs.json` into the
// `library_*` tables, in that order: entries list their `sources` in credit
// order (`[{ source: <slug>, pageTitle, pageUrl?, author?, retrievedAt? }]`), hubs
// reference entry / kindling-audio slugs that must already be ingested.
// Each entry's body is its own markdown file (`bodyPath`, relative to the
// manifest dir), never inlined.
//
// Idempotent: every record is sent with a sha256 of its manifest JSON (+
// body); the mutation no-ops when it matches the stored one, so re-running
// an unchanged tree writes nothing. Continue-on-error like kindling — a
// rejected record is logged and the run exits 1 at the end.
//
// Hard gates (enforced in convex/library/ingest.ts, the trust boundary):
// a first-hand story (`kind: story`, `reuse: original`) needs
// `consentRecordedAt`; an explainer can only be `active: true` once
// `library/admin:markSafetyReviewed` has signed off its current body. Soft
// gate (#404): a verbatim entry from a source with `refreshDays` (NHS = 7)
// whose source `retrievedAt` is older than that prints a refresh nag — it still
// ingests. Alt text is a hard gate too (#400): an image with empty alt is
// rejected unless the record lists its src in `decorativeImages`.
// Unpublishing is `library/admin:setActive`, not this script.
//
// A cover is `coverPath` on the entry, relative to `media/cover/` (gitignored).
// It's uploaded to R2 (like kindling's thumbs) under `library-thumb/<sha>.<ext>`
// and the key kept in `coverKey`; the URL is signed at read. A plain `coverUrl`
// still works for a hosted image, but an uploaded cover wins. Hubs take the
// same `coverPath`, uploaded under `hub-cover/<sha>.<ext>`.
//
// `--cover-variants` (#506, off by default) also resizes each entry cover to a
// 512px and a 1280px WebP (sharp: lanczos3, q78, effort 6), uploaded beside the
// untouched original as `library-thumb/<sha>.webp` and kept in `cover512Key` /
// `cover1280Key`; the run logs each file's key and size. The keys join the
// record hash, so the first flagged run updates every entry once; without the
// flag, output and hashes are exactly as before — try it on dev before --prod.
// The WebP keys hash sharp's output, so a sharp/libvips upgrade that changes the
// bytes makes the next flagged run update every entry (old WebPs stay as orphans).
// The same flag stores a base64 ThumbHash of the cover (#507) in `coverThumbhash`,
// encoded from a ≤100px sharp copy; the app shows it while the cover loads.
// Hubs (#508) get the same flag but only the 1280 WebP (`hub-cover/<sha>.webp`,
// `cover1280Key`) and the ThumbHash — a hub cover is never shown small.
// The variant fields join the hash, so an unflagged run after a flagged one
// drops them again (back to the original cover): keep the flag on every run.
//
// Audio (#411) is a last pass over `audio.json`, keyed by `entrySlug`:
// `[{ entrySlug, audioPath, transcriptPath, active, title? }]`, paths relative to
// `media/` beside the manifest (gitignored, like kindling's). The script
// cuts the free 30s preview itself (ffmpeg) and probes the duration
// (ffprobe), so both need to be on PATH. No `audio.json` → no audio pass.
//
// dev/ (small fixture set) and prod/ (real catalogue) are disjoint trees,
// same convention as scripts/kindling — `--prod` picks both the deployment
// and the prod/ tree.
//
// Usage:
//   bun scripts/library/ingest.ts             # dev deployment + dev/ fixtures
//   bun scripts/library/ingest.ts --prod      # prod deployment + prod/ catalogue
//   bun scripts/library/ingest.ts --cover-variants   # + 512/1280 WebP covers (add --prod for prod)
//   bun scripts/library/ingest.ts --manifest scripts/library/dev/manifest.json   # sources/hubs read from the same dir

import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { rgbaToThumbHash } from "thumbhash";

type Source = { slug: string; refreshDays?: number; [k: string]: unknown };
type Entry = {
  slug: string;
  sources: { source: string; retrievedAt?: number }[];
  reuse: string;
  bodyPath: string;
  coverPath?: string;
  decorativeImages?: string[];
  [k: string]: unknown;
};
type Hub = { slug: string; coverPath?: string; [k: string]: unknown };
type Audio = { entrySlug: string; audioPath: string; transcriptPath: string; active: boolean; title?: string };

const args = process.argv.slice(2);
const i = args.indexOf("--manifest");
const prod = args.includes("--prod");
const coverVariants = args.includes("--cover-variants");
const manifestPath = path.resolve(i === -1 ? `scripts/library/${prod ? "prod" : "dev"}/manifest.json` : args[i + 1]);
const dir = path.dirname(manifestPath);
const DAY_MS = 86_400_000;
const PREVIEW_SEC = 30; // the free preview (#390)

const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8"));
const sha256 = (...parts: string[]) => createHash("sha256").update(parts.join("\u0000")).digest("hex");

function convexRun<T = { action: string }>(fn: string, jsonArgs: unknown): T {
  const out = execFileSync(
    "npx",
    ["convex", "run", fn, JSON.stringify(jsonArgs), ...(prod ? ["--prod"] : [])],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  return JSON.parse(out);
}

let failures = 0;
async function attempt(label: string, fn: () => { action: string } | Promise<{ action: string }>) {
  try {
    console.log(`${label}: ${(await fn()).action}`);
  } catch (err) {
    failures++;
    console.error(`${label}: FAILED — ${(err as Error).message}`);
  }
}

async function upload(key: string, body: Buffer) {
  const { url } = convexRun<{ url: string }>("ai/paths/audioTracks:mintUploadUrl", { key });
  const res = await fetch(url, { method: "PUT", body: new Uint8Array(body), signal: AbortSignal.timeout(10 * 60_000) });
  if (!res.ok) throw new Error(`upload failed (${res.status}): ${key}`);
}

// Content-addressed like kindling's thumbs: the key is the hash, so an unchanged
// cover is the same key and is only re-PUT (idempotent), never duplicated.
async function uploadContent(prefix: string, file: Buffer, ext: string) {
  const key = `${prefix}/${createHash("sha256").update(file).digest("hex")}${ext}`;
  await upload(key, file);
  return key;
}

const readCover = (coverPath: string) => readFileSync(path.resolve(dir, "media/cover", coverPath));

async function uploadCover(coverPath: string, prefix = "library-thumb", file = readCover(coverPath)) {
  return { coverKey: await uploadContent(prefix, file, path.extname(coverPath).toLowerCase()) };
}

// The original's key, plus the --cover-variants fields when the flag is on.
async function coverFields(coverPath: string | undefined, prefix: string, variants: (file: Buffer) => Promise<object>) {
  if (!coverPath) return {};
  const file = readCover(coverPath);
  return { ...(await uploadCover(coverPath, prefix, file)), ...(coverVariants ? await variants(file) : {}) };
}

// --cover-variants: a resized WebP of the cover, uploaded and logged with its size.
async function uploadCoverVariant(file: Buffer, px: number, prefix: string) {
  const webp = await sharp(file)
    .resize(px, px, { fit: "inside", withoutEnlargement: true, kernel: "lanczos3" })
    .webp({ quality: 78, effort: 6 })
    .toBuffer();
  const key = await uploadContent(prefix, webp, ".webp");
  console.log(`  ${px}px ${key}: ${webp.length} bytes (original ${file.length} bytes)`);
  return key;
}

// The entry cover's 512 (list thumbnails) and 1280 (full-width) WebPs.
async function uploadCoverVariants(file: Buffer) {
  return {
    cover512Key: await uploadCoverVariant(file, 512, "library-thumb"),
    cover1280Key: await uploadCoverVariant(file, 1280, "library-thumb"),
    coverThumbhash: await thumbhashOf(file),
  };
}

// Hubs are never shown small (#508): only the 1280.
async function uploadHubCoverVariants(file: Buffer) {
  return { cover1280Key: await uploadCoverVariant(file, 1280, "hub-cover"), coverThumbhash: await thumbhashOf(file) };
}

// ThumbHash encodes at most 100×100 RGBA.
async function thumbhashOf(file: Buffer) {
  const { data, info } = await sharp(file)
    .resize(100, 100, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return Buffer.from(rgbaToThumbHash(info.width, info.height, data)).toString("base64");
}

async function ingestAudio(a: Audio) {
  const media = path.join(dir, "media");
  const file = path.resolve(media, a.audioPath);
  const audio = readFileSync(file);
  const transcript = readFileSync(path.resolve(media, a.transcriptPath), "utf8").trim();
  const ext = path.extname(file);
  const durationSec = Number(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }),
  );
  if (!(durationSec > PREVIEW_SEC)) throw new Error(`audio is ${durationSec}s — must be longer than the ${PREVIEW_SEC}s preview`);
  const previewFile = path.join(mkdtempSync(path.join(tmpdir(), "library-audio-")), `preview${ext}`);
  execFileSync("ffmpeg", ["-v", "error", "-i", file, "-t", String(PREVIEW_SEC), "-c", "copy", previewFile]);

  // Fresh keys per attempt; the mutation deletes whichever pair loses.
  const id = randomUUID();
  const key = `library/${a.entrySlug}/${id}${ext}`;
  const previewKey = `library/${a.entrySlug}/${id}.preview${ext}`;
  try {
    await upload(key, audio);
    await upload(previewKey, readFileSync(previewFile));
  } catch (err) {
    for (const k of [key, previewKey]) {
      try {
        convexRun("ai/paths/audioTracks:discardUpload", { audioKey: k });
      } catch {
        // best-effort: an orphan blob is harmless
      }
    }
    throw err;
  }
  // No discard past this point: a failed CLI call may still have committed,
  // and the row would then point at deleted blobs. Worst case is an orphan.
  return convexRun("library/audio:upsertEntryAudio", {
    audio: {
      entrySlug: a.entrySlug,
      key,
      previewKey,
      durationSec: Math.round(durationSec),
      transcript,
      title: a.title,
      active: a.active,
      sha256: sha256(createHash("sha256").update(audio).digest("hex"), transcript),
    },
  });
}

async function main() {
  const sources = readJson<Source[]>(path.join(dir, "sources.json"));
  const entries = readJson<Entry[]>(manifestPath);
  const hubs = readJson<Hub[]>(path.join(dir, "hubs.json"));

  if (!prod) execFileSync("npx", ["convex", "dev", "--once"], { stdio: "inherit" });

  for (const source of sources) {
    await attempt(`source ${source.slug}`, () =>
      convexRun("library/ingest:upsertSource", { source, sha256: sha256(JSON.stringify(source)) }),
    );
  }

  const refreshDays = new Map(sources.map((s) => [s.slug, s.refreshDays]));
  for (const record of entries) {
    const [s] = record.sources;
    const days = s && refreshDays.get(s.source);
    if (days && record.reuse === "verbatim" && (s.retrievedAt ?? 0) < Date.now() - days * DAY_MS) {
      console.warn(`entry ${record.slug}: WARNING — verbatim copy older than ${days} days, re-pull it from ${s.source}`);
    }
    await attempt(`entry ${record.slug}`, async () => {
      const markdown = readFileSync(path.resolve(dir, record.bodyPath), "utf8");
      const { bodyPath: _bodyPath, coverPath, decorativeImages, ...rest } = record;
      const cover = await coverFields(coverPath, "library-thumb", uploadCoverVariants);
      const entry = { ...rest, ...cover };
      return convexRun("library/ingest:upsertEntry", {
        entry,
        markdown,
        decorativeImages,
        sha256: sha256(JSON.stringify({ ...record, ...cover }), markdown),
      });
    });
  }

  for (const hub of hubs) {
    await attempt(`hub ${hub.slug}`, async () => {
      const { coverPath, ...rest } = hub;
      const cover = await coverFields(coverPath, "hub-cover", uploadHubCoverVariants);
      const doc = { ...rest, ...cover };
      return convexRun("library/ingest:upsertHub", { hub: doc, sha256: sha256(JSON.stringify(doc)) });
    });
  }

  const audioPath = path.join(dir, "audio.json");
  for (const a of existsSync(audioPath) ? readJson<Audio[]>(audioPath) : []) {
    await attempt(`audio ${a.entrySlug}`, () => ingestAudio(a));
  }

  if (failures > 0) process.exit(1);
}

main();
