// Fill `transcript` on every active support track in a manifest with
// ElevenLabs Scribe (#573). Skips tracks that already have one, and writes the
// manifest after each track, so a failed run resumes where it stopped.
// Review the text, then run ingest so the meaning index re-embeds it.
//
// Needs ELEVENLABS_STT_API_KEY in .env.local — a key with the
// `speech_to_text` permission (the Agents key lacks it).
//
//   bun scripts/kindling/transcribe.ts                       # prod manifest
//   bun scripts/kindling/transcribe.ts --manifest scripts/kindling/dev/manifest.json

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const i = process.argv.indexOf("--manifest");
const manifestPath = path.resolve(i > 0 ? process.argv[i + 1] : "scripts/kindling/prod/manifest.json");
const mediaDir = path.join(path.dirname(manifestPath), "media");
const key = process.env.ELEVENLABS_STT_API_KEY;
if (!key) throw new Error("Set ELEVENLABS_STT_API_KEY (needs the speech_to_text permission)");

type Track = { slug: string; family: string; active?: boolean; audioPath: string; transcript?: string };
const manifest: Track[] = JSON.parse(readFileSync(manifestPath, "utf8"));
const todo = manifest.filter((t) => t.family === "support" && t.active !== false && !t.transcript);

for (const track of todo) {
  const form = new FormData();
  form.append("model_id", "scribe_v2");
  form.append("tag_audio_events", "false");
  form.append("file", new Blob([readFileSync(path.join(mediaDir, track.audioPath))]), path.basename(track.audioPath));
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": key },
    body: form,
  });
  if (!res.ok) throw new Error(`${track.slug}: ${res.status} ${await res.text()}`);
  track.transcript = ((await res.json()) as { text: string }).text.trim();
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`✓ ${track.slug} (${track.transcript.length} chars)`);
}
console.log(`Done: ${todo.length} transcribed`);
