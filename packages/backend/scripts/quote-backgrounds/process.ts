// Turns the owner's generated art into what ships (B18):
//
//   <in>/stills/<key>.{png,jpg,jpeg,webp}  →  apps/mobile/assets/quotes/stills/<key>.webp
//       1080 × 1920 cover crop, WebP sized to ~150–250 KB (bundled in the app)
//   <in>/loops/<key>.mp4                   →  media/<key>.mp4, .webp, .m4a
//       the video with its seam crossfaded, H.264 720 × 1280, ~1–1.5 MB, silent;
//       its first frame as a WebP poster; its sound as a ~30 s seamless
//       ambient track, AAC 96 kbps (the three are hosted: upload.ts)
//
// Keys come from manifest.json; a key with no art file is skipped and named.
// Needs ffmpeg and ffprobe on PATH. Repeatable: it overwrites its outputs.
//
// Usage (from packages/backend):
//   bun run quote-backgrounds:process --in ~/Developer/XolaceInc/quote-art
//   bun run quote-backgrounds:process --in <dir> --only rain-window,first-light
//   ... --stills-out <dir> --media-out <dir>   (default: the app's assets, media/)

import { execFileSync, spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { type ManifestEntry, parseManifest, pick } from "./manifest";
import {
	AUDIO,
	audioPlan,
	chainFilter,
	gainDb,
	nextStillQuality,
	rotateFilter,
	SAMPLE_RATE,
	STILL,
	seamAudioFilter,
	videoArgs,
} from "./plan";

const HERE = import.meta.dirname;
const args = process.argv.slice(2);
const flag = (name: string) => {
	const i = args.indexOf(`--${name}`);
	return i === -1 ? undefined : args[i + 1];
};
const inDir = flag("in") ?? process.env.QUOTE_ART_DIR;
const stillsOut =
	flag("stills-out") ??
	path.join(HERE, "../../../../apps/mobile/assets/quotes/stills");
const mediaOut = flag("media-out") ?? path.join(HERE, "media");
const only = flag("only")
	?.split(",")
	.map((k) => k.trim())
	.filter(Boolean);

const run = (bin: string, argv: string[]) =>
	execFileSync(bin, argv, {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	});

const ffmpeg = (argv: string[]) => run("ffmpeg", ["-hide_banner", ...argv]);

/** Seconds a stream (or the file) runs, from ffprobe. */
function durationOf(file: string, stream: "v:0" | "a:0"): number {
	const out = run("ffprobe", [
		"-v",
		"error",
		"-select_streams",
		stream,
		"-show_entries",
		"stream=duration:format=duration",
		"-of",
		"default=nw=1:nk=1",
		file,
	]);
	const values = out
		.split("\n")
		.map(Number)
		.filter((n) => n > 0);
	if (values.length === 0) {
		throw new Error(`no ${stream} duration in ${path.basename(file)}`);
	}
	return values[0];
}

const hasAudio = (file: string) =>
	run("ffprobe", [
		"-v",
		"error",
		"-select_streams",
		"a",
		"-show_entries",
		"stream=index",
		"-of",
		"csv=p=0",
		file,
	]).trim() !== "";

const kb = (file: string) => `${Math.round(statSync(file).size / 1000)} KB`;

function findArt(dir: string, key: string, exts: string[]): string | undefined {
	return exts
		.map((ext) => path.join(dir, `${key}.${ext}`))
		.find((file) => existsSync(file));
}

async function processStill(source: string, key: string): Promise<string> {
	const out = path.join(stillsOut, `${key}.webp`);
	const resized = sharp(source)
		.rotate()
		.resize(STILL.width, STILL.height, { fit: "cover" });
	let quality: number = STILL.quality;
	let webp = await resized.clone().webp({ effort: 6, quality }).toBuffer();
	while (webp.length > STILL.maxBytes && quality > STILL.minQuality) {
		quality = nextStillQuality(quality);
		webp = await resized.clone().webp({ effort: 6, quality }).toBuffer();
	}
	writeFileSync(out, webp);
	return `still → ${kb(out)} (q${quality})`;
}

function processAudio(source: string, tmp: string, out: string): string {
	const src = path.join(tmp, "src.wav");
	ffmpeg([
		"-y",
		"-i",
		source,
		"-vn",
		"-ac",
		"2",
		"-ar",
		String(SAMPLE_RATE),
		src,
	]);
	const plan = audioPlan(durationOf(src, "a:0"));

	const base = path.join(tmp, "base.wav");
	ffmpeg([
		"-y",
		"-i",
		src,
		"-filter_complex",
		seamAudioFilter(samplesOf(src), plan.seam),
		base,
	]);
	const baseLength = durationOf(base, "a:0");
	const copies = plan.rotations.map((at, k) => {
		const file = path.join(tmp, `copy-${k}.wav`);
		ffmpeg([
			"-y",
			"-i",
			base,
			"-filter_complex",
			rotateFilter(baseLength, at),
			file,
		]);
		return file;
	});
	const chain = path.join(tmp, "chain.wav");
	ffmpeg([
		"-y",
		...copies.flatMap((file) => ["-i", file]),
		"-filter_complex",
		chainFilter(copies.length, plan.crossfade),
		chain,
	]);
	const seamed = path.join(tmp, "seamed.wav");
	ffmpeg([
		"-y",
		"-i",
		chain,
		"-filter_complex",
		seamAudioFilter(samplesOf(chain), plan.crossfade, true),
		seamed,
	]);

	const gain = gainDb(loudnessOf(seamed));
	ffmpeg([
		"-y",
		"-i",
		seamed,
		"-af",
		`volume=${gain}dB`,
		"-c:a",
		"aac",
		"-b:a",
		AUDIO.bitrate,
		"-movflags",
		"+faststart",
		out,
	]);
	return `sound ${durationOf(out, "a:0").toFixed(1)} s → ${kb(out)}`;
}

/** A WAV's length in samples (at SAMPLE_RATE, as src.wav is written). */
const samplesOf = (wav: string) =>
	Math.round(durationOf(wav, "a:0") * SAMPLE_RATE);

/** Integrated loudness (LUFS) and true peak (dBTP), from ffmpeg's ebur128. */
function loudnessOf(file: string): { loudness: number; truePeak: number } {
	const { status, stderr } = spawnSync(
		"ffmpeg",
		[
			"-hide_banner",
			"-nostats",
			"-i",
			file,
			"-af",
			"ebur128=peak=true",
			"-f",
			"null",
			"-",
		],
		{ encoding: "utf8" }
	);
	const summary = stderr.slice(stderr.lastIndexOf("Summary:"));
	const loudness = Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]);
	const truePeak = Number(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]);
	if (status !== 0 || Number.isNaN(loudness) || Number.isNaN(truePeak)) {
		throw new Error("couldn't measure the sound's loudness");
	}
	return { loudness, truePeak };
}

async function processLoop(source: string, key: string): Promise<string> {
	const tmp = mkdtempSync(path.join(tmpdir(), `quote-loop-${key}-`));
	try {
		const duration = durationOf(source, "v:0");
		const video = path.join(mediaOut, `${key}.mp4`);
		const passlog = path.join(tmp, "x264");
		for (const pass of [1, 2] as const) {
			ffmpeg(
				videoArgs({ duration, input: source, output: video, pass, passlog })
			);
		}
		const frame = path.join(tmp, "frame.png");
		ffmpeg(["-y", "-i", video, "-frames:v", "1", frame]);
		const poster = path.join(mediaOut, `${key}.webp`);
		writeFileSync(
			poster,
			await sharp(readFileSync(frame)).webp({ quality: 80 }).toBuffer()
		);
		const parts = [
			`video ${durationOf(video, "v:0").toFixed(2)} s → ${kb(video)}`,
			`poster → ${kb(poster)}`,
		];
		const audio = path.join(mediaOut, `${key}.m4a`);
		if (hasAudio(source)) {
			parts.push(processAudio(source, tmp, audio));
		} else {
			rmSync(audio, { force: true });
			parts.push("no sound in the source");
		}
		return parts.join(", ");
	} finally {
		rmSync(tmp, { force: true, recursive: true });
	}
}

async function processOne(entry: ManifestEntry): Promise<string> {
	if (!inDir) {
		throw new Error("pass --in <art folder> (or set QUOTE_ART_DIR)");
	}
	if (entry.kind === "still") {
		const source = findArt(path.join(inDir, "stills"), entry.key, [
			"png",
			"jpg",
			"jpeg",
			"webp",
		]);
		return source
			? await processStill(source, entry.key)
			: "no art (drawn in code, or not made yet)";
	}
	const source = findArt(path.join(inDir, "loops"), entry.key, ["mp4", "mov"]);
	return source ? await processLoop(source, entry.key) : "no art yet";
}

/** An ffmpeg failure's message is its whole log: keep the end, where the reason is. */
const lastLines = (err: unknown) =>
	(err instanceof Error ? err.message : String(err))
		.trim()
		.split("\n")
		.slice(-4)
		.join("\n");

async function main() {
	const manifest = pick(
		parseManifest(
			JSON.parse(readFileSync(path.join(HERE, "manifest.json"), "utf8"))
		),
		only
	);
	mkdirSync(stillsOut, { recursive: true });
	mkdirSync(mediaOut, { recursive: true });
	let failures = 0;
	for (const entry of manifest) {
		try {
			console.log(`${entry.key}: ${await processOne(entry)}`);
		} catch (err) {
			failures++;
			console.error(`${entry.key}: FAILED — ${lastLines(err)}`);
		}
	}
	if (failures > 0) {
		process.exit(1);
	}
}

await main();
