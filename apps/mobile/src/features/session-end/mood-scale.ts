// "How do you feel now?" as numbers. The slider runs 0 (heavier) … 0.5 (the same, a magnet
// snaps to it) … 1 (lighter). Each half has five steps. The session still saves one word;
// the exact position goes beside it as `moodPosition`.

export const SAME = 0.5;
const MAGNET = 0.06;
const STEPS = 5;
const LOW_MAX = 2;
const MID = 3;
// "lighter" and "much lighter" get sparkle eyes; "a little lighter" keeps the plain ones.
const SPARKLE_FROM = 3;

export type SliderMood = "heavier" | "same" | "lighter";
export type IntensityBucket = "low" | "mid" | "high";

/** Pulls a position near the centre onto "the same". */
export function snap(position: number): number {
	"worklet";
	return Math.abs(position - SAME) < MAGNET ? SAME : position;
}

/** 0 at the centre; -1…-5 heavier, 1…5 lighter (how far past the magnet). */
export function stepOf(position: number): number {
	"worklet";
	if (position === SAME) {
		return 0;
	}
	const depth = (Math.abs(position - SAME) - MAGNET) / (SAME - MAGNET);
	const n = Math.min(STEPS, Math.max(1, Math.ceil(depth * STEPS)));
	return position < SAME ? -n : n;
}

export function moodOf(step: number): SliderMood {
	if (step === 0) {
		return "same";
	}
	return step < 0 ? "heavier" : "lighter";
}

/** The heavier follow-up's buckets for an intensity of 1–5: ≤2 low, 3 mid, ≥4 high. */
export function intensityBucket(intensity: number): IntensityBucket {
	if (intensity <= LOW_MAX) {
		return "low";
	}
	return intensity === MID ? "mid" : "high";
}

/** The status word under the face, graded like the follow-up's buckets. */
export function wordsFor(step: number): string {
	const mood = moodOf(step);
	if (mood === "same") {
		return "the same";
	}
	const bucket = intensityBucket(Math.abs(step));
	if (bucket === "low") {
		return `a little ${mood}`;
	}
	return bucket === "mid" ? mood : `much ${mood}`;
}

export function hasSparkle(step: number): boolean {
	return step >= SPARKLE_FROM;
}

/** How much heavier (1–5) a position is, for the follow-up; 0 when it isn't heavier. */
export function heavierIntensity(position: number): number {
	const step = stepOf(snap(position));
	return step < 0 ? -step : 0;
}
