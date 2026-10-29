// Measure each track's loudness (EBU R128) so the player can even out volume
// from one track to the next: integrated loudness in LUFS and the true peak in
// dBTP, written into the manifest as `loudness`. ingest.ts carries it to Convex.
//
// Usage (from packages/backend; needs ffmpeg on PATH):
//   bun scripts/kindling/measure-loudness.ts --prod          # tracks not yet measured
//   bun scripts/kindling/measure-loudness.ts --prod --force  # every track again
//
// The audio hash is kept beside the numbers, so a replaced file is measured again.

import { execFile } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

type Loudness = { lufs: number; sha256: string; truePeak: number };
type Track = {
	audioPath: string;
	loudness?: Loudness;
	sha256: string;
	slug: string;
};

const args = process.argv.slice(2);
const dir = path.resolve(
	`scripts/kindling/${args.includes("--prod") ? "prod" : "dev"}`
);
const force = args.includes("--force");
const manifestPath = path.join(dir, "manifest.json");
const mediaDir = path.join(dir, "media");
const CONCURRENCY = 6;
// ffmpeg's ebur128 summary: "I: -14.2 LUFS" and, with peak=true, "Peak: -1.0 dBFS".
const INTEGRATED = /I:\s+(-?[\d.]+|-inf) LUFS/;
const TRUE_PEAK = /Peak:\s+(-?[\d.]+|-inf) dBFS/;

const run = promisify(execFile);

async function measure(t: Track): Promise<Loudness> {
	// ffmpeg writes the filter's report to stderr; the decoded audio goes nowhere.
	const { stderr } = await run(
		"ffmpeg",
		[
			"-hide_banner",
			"-nostats",
			"-i",
			path.join(mediaDir, t.audioPath),
			"-filter_complex",
			"ebur128=peak=true",
			"-f",
			"null",
			"-",
		],
		{ maxBuffer: 64 * 1024 * 1024 }
	);
	const summary = stderr.slice(stderr.lastIndexOf("Summary:"));
	const lufs = summary.match(INTEGRATED)?.[1];
	const truePeak = summary.match(TRUE_PEAK)?.[1];
	if (!(lufs && truePeak) || lufs === "-inf") {
		throw new Error(`${t.slug}: no loudness in ffmpeg's report`);
	}
	return {
		lufs: Number(lufs),
		sha256: t.sha256,
		truePeak: truePeak === "-inf" ? -100 : Number(truePeak),
	};
}

const manifest: Track[] = JSON.parse(readFileSync(manifestPath, "utf8"));
const todo = manifest.filter((t) => force || t.loudness?.sha256 !== t.sha256);
console.log(`Measuring ${todo.length} of ${manifest.length} tracks`);

const queue = [...todo];
const failed: string[] = [];
await Promise.all(
	Array.from({ length: CONCURRENCY }, async () => {
		for (let t = queue.shift(); t; t = queue.shift()) {
			try {
				t.loudness = await measure(t);
			} catch (error) {
				failed.push(`${t.slug}: ${(error as Error).message}`);
			}
		}
	})
);

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
const measured = manifest.flatMap((t) => (t.loudness ? [t.loudness.lufs] : []));
measured.sort((a, b) => a - b);
console.log(
	`Measured ${todo.length - failed.length}. Loudest ${measured.at(-1)} LUFS, quietest ${measured[0]} LUFS, median ${measured[Math.floor(measured.length / 2)]} LUFS.`
);
if (failed.length > 0) {
	console.error(failed.join("\n"));
	process.exit(1);
}
