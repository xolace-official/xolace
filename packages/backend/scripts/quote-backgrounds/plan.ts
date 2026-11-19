// The numbers and ffmpeg arguments behind process.ts, kept pure so they're
// tested without ffmpeg. See process.ts for the steps they make.

/** The loop's frame: 9:16 at 720p, 30 fps. */
export const VIDEO = { fps: 30, height: 1280, width: 720 } as const;
/** About 1–1.5 MB per loop, whatever its length. */
export const VIDEO_TARGET_BYTES = 1_250_000;
const VIDEO_KBPS = { max: 2500, min: 900 } as const;
/** The ambient track: ~30 s, AAC 96 kbps, soft. */
export const AUDIO = {
	bitrate: "96k",
	crossfade: 2,
	loudness: -24,
	targetSeconds: 30,
	truePeak: -2,
} as const;
/** The bundled stills: 1080 × 1920 WebP, ~150–250 KB. */
export const STILL = {
	height: 1920,
	maxBytes: 260_000,
	minQuality: 50,
	quality: 80,
	width: 1080,
} as const;

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** How long the video's seam crossfade runs: up to a second, less for a short clip. */
export const seamSeconds = (duration: number) =>
	round3(Math.min(1, duration / 6));

/** The bitrate that lands a loop of this length near the target size. */
export function videoKbps(seconds: number): number {
	const kbps = Math.round((VIDEO_TARGET_BYTES * 8) / seconds / 1000);
	return Math.min(VIDEO_KBPS.max, Math.max(VIDEO_KBPS.min, kbps));
}

/**
 * The seam: the clip from F to the end, with its last F seconds crossfaded
 * into its first F. The output ends on the frame it starts after, so the
 * repeat can't be seen; it is F shorter than the source.
 */
export function videoFilter(duration: number): string {
	const f = seamSeconds(duration);
	const { fps, height, width } = VIDEO;
	return [
		`[0:v]fps=${fps},scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,format=yuv420p,split=2[a][b]`,
		`[a]trim=start=${f}:end=${round3(duration)},setpts=PTS-STARTPTS[main]`,
		`[b]trim=start=0:end=${f},setpts=PTS-STARTPTS[head]`,
		`[main][head]xfade=transition=fade:duration=${f}:offset=${round3(duration - 2 * f)},format=yuv420p[v]`,
	].join(";");
}

/** One pass of the two-pass x264 encode (silent: the sound is its own file). */
export function videoArgs(opts: {
	duration: number;
	input: string;
	output: string;
	pass: 1 | 2;
	passlog: string;
}): string[] {
	const kbps = videoKbps(opts.duration - seamSeconds(opts.duration));
	return [
		"-y",
		"-i",
		opts.input,
		"-filter_complex",
		videoFilter(opts.duration),
		"-map",
		"[v]",
		"-an",
		"-c:v",
		"libx264",
		"-preset",
		"slow",
		"-profile:v",
		"high",
		"-b:v",
		`${kbps}k`,
		"-maxrate",
		`${Math.round(kbps * 1.5)}k`,
		"-bufsize",
		`${kbps * 2}k`,
		"-pass",
		String(opts.pass),
		"-passlogfile",
		opts.passlog,
		"-movflags",
		"+faststart",
		...(opts.pass === 1 ? ["-f", "mp4", "/dev/null"] : [opts.output]),
	];
}

export type AudioPlan = {
	/** Crossfade between copies, and at the final seam. */
	crossfade: number;
	/** Seconds the finished track runs. */
	length: number;
	/** Where each copy of the seamless base starts (seconds into it). */
	rotations: number[];
	/** The base's own seam: its end crossfaded into its start. */
	seam: number;
};

/** Golden-ratio steps spread the copies' start points without a pattern. */
const PHI = 0.618_034;

/**
 * The ambient track, from a clip of `duration` seconds: a seamless base
 * (the clip with its end crossfaded into its start), then copies of it, each
 * started at a different point, crossfaded into one another until ~30 s,
 * and that crossfaded end-into-start once more. Copies at different points
 * don't line up, so the sound has no 6-second pattern, and it never restarts
 * with the video.
 */
export function audioPlan(duration: number): AudioPlan {
	const seam = round3(Math.min(1.5, duration / 4));
	const base = duration - seam;
	const crossfade = round3(Math.min(AUDIO.crossfade, base / 3));
	const copies = Math.max(
		2,
		Math.ceil(AUDIO.targetSeconds / (base - crossfade))
	);
	const rotations = Array.from({ length: copies }, (_, k) =>
		round3(((k * PHI) % 1) * base)
	);
	return {
		crossfade,
		length: round3(copies * (base - crossfade)),
		rotations,
		seam,
	};
}

/** The sound's sample rate, and AAC's frame: a track a whole number of frames
 * long gets no end padding, which would put a click at the wrap. */
export const SAMPLE_RATE = 48_000;
export const AAC_FRAME = 1024;

/**
 * A clip of `samples` with its last `seam` seconds crossfaded into its first
 * (equal power): it ends where it starts, so it repeats without a seam. With
 * `wholeFrames`, the end is trimmed so the result is a whole number of AAC
 * frames.
 */
export function seamAudioFilter(
	samples: number,
	seam: number,
	wholeFrames = false
): string {
	const seamSamples = Math.round(seam * SAMPLE_RATE);
	const out = samples - seamSamples;
	const kept = wholeFrames ? out - (out % AAC_FRAME) : out;
	return [
		"[0:a]asplit=2[a][b]",
		`[a]atrim=start_sample=${seamSamples}:end_sample=${seamSamples + kept},asetpts=PTS-STARTPTS[main]`,
		`[b]atrim=start_sample=0:end_sample=${seamSamples},asetpts=PTS-STARTPTS[head]`,
		`[main][head]acrossfade=ns=${seamSamples}:c1=qsin:c2=qsin`,
	].join(";");
}

/** One gain for the whole track, toward the target loudness without passing
 * the peak ceiling: a constant gain can't disturb the seam, as a limiter would. */
export function gainDb(measured: {
	loudness: number;
	truePeak: number;
}): number {
	const gain = Math.min(
		AUDIO.loudness - measured.loudness,
		AUDIO.truePeak - measured.truePeak
	);
	return Math.round(gain * 10) / 10;
}

/** The seamless base started at `at` seconds (it wraps, so the join is clean). */
export function rotateFilter(length: number, at: number): string {
	if (at <= 0) {
		return "[0:a]anull";
	}
	return [
		"[0:a]asplit=2[a][b]",
		`[a]atrim=start=${at}:end=${round3(length)},asetpts=PTS-STARTPTS[tail]`,
		`[b]atrim=start=0:end=${at},asetpts=PTS-STARTPTS[lead]`,
		"[tail][lead]concat=n=2:v=0:a=1",
	].join(";");
}

/** Inputs 0…n-1 crossfaded one into the next. */
export function chainFilter(count: number, crossfade: number): string {
	const steps: string[] = [];
	let last = "[0:a]";
	for (let i = 1; i < count; i++) {
		const out = i === count - 1 ? "" : `[x${i}]`;
		steps.push(
			`${last}[${i}:a]acrossfade=d=${crossfade}:c1=qsin:c2=qsin${out}`
		);
		last = `[x${i}]`;
	}
	return steps.join(";");
}

/**
 * The art file for `key` among a folder's `files`, trying `exts` in order. The
 * extension matches in any case (the owner's camera exports `.MP4`), and the
 * name comes back as it is on disk, so nothing is renamed.
 */
export function artFileName(
	files: readonly string[],
	key: string,
	exts: readonly string[]
): string | undefined {
	for (const ext of exts) {
		const hit = files.find(
			(file) => file.toLowerCase() === `${key}.${ext}`.toLowerCase()
		);
		if (hit) {
			return hit;
		}
	}
	return undefined;
}

/** The WebP quality to try next when a still came out too big. */
export const nextStillQuality = (quality: number) => quality - 8;
