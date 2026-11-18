/**
 * "How do you feel now?" as numbers. The slider runs 0 (heavier) … .5 (the same,
 * a magnet snaps to it) … 1 (lighter); each half has five steps. The session
 * saves one word, with the exact position beside it as `moodPosition`.
 */
export const SAME = 0.5;
const MAGNET = 0.06;
const STEPS = 5;
const LOW_MAX = 2;
const MID = 3;
/** "lighter" and "much lighter" get sparkle eyes; "a little lighter" keeps the plain ones. */
const SPARKLE_FROM = 3;
/** From step −3 ("heavier") down, Continue asks one follow-up first. */
const FOLLOW_UP_FROM = -3;
/** Steps −4 and −5 get the follow-up's heavier question. */
const FOLLOW_UP_HIGH = -4;

export type SliderMood = "heavier" | "same" | "lighter";

/** Pulls a position near the centre onto "the same". */
export function snap(position: number): number {
	"worklet";
	return Math.abs(position - SAME) < MAGNET ? SAME : position;
}

/** 0 at the centre; −1…−5 heavier, 1…5 lighter (how far past the magnet). */
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

/** The word under the face: ≤ 2 "a little", 3 plain, ≥ 4 "much". */
export function wordsFor(step: number): string {
	const mood = moodOf(step);
	if (mood === "same") {
		return "the same";
	}
	const n = Math.abs(step);
	if (n <= LOW_MAX) {
		return `a little ${mood}`;
	}
	return n === MID ? mood : `much ${mood}`;
}

export function hasSparkle(step: number | null): boolean {
	return step !== null && step >= SPARKLE_FROM;
}

/** A heavier answer asks one follow-up first (step −3 and below). */
export const asksFollowUp = (step: number | null): boolean =>
	step !== null && step <= FOLLOW_UP_FROM;

/** Which follow-up question a heavier answer gets: "mid" at −3, "high" from −4. */
export const followUpBucket = (step: number): "mid" | "high" =>
	step <= FOLLOW_UP_HIGH ? "high" : "mid";

/**
 * A step's centre, for VoiceOver's increment and decrement (one step each;
 * production nudged by .1, which skipped steps).
 */
export function centreOf(step: number): number {
	if (step === 0) {
		return SAME;
	}
	const n = Math.min(STEPS, Math.abs(step));
	const off = MAGNET + ((n - 0.5) / STEPS) * (SAME - MAGNET);
	return step < 0 ? SAME - off : SAME + off;
}

/** One step from `from` (null: unanswered, so the centre), within the scale. */
export const stepBy = (from: number | null, dir: 1 | -1): number =>
	Math.max(-STEPS, Math.min(STEPS, (from ?? 0) + dir));
