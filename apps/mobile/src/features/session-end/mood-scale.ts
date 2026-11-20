export const SAME = 0.5;
const MAGNET = 0.06;
const STEPS = 5;
const LOW_MAX = 2;
const MID = 3;
const SPARKLE_FROM = 3;
const FOLLOW_UP_FROM = -3;
const FOLLOW_UP_HIGH = -4;

export type SliderMood = "heavier" | "same" | "lighter";

export function snap(position: number): number {
	"worklet";
	return Math.abs(position - SAME) < MAGNET ? SAME : position;
}

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

export const asksFollowUp = (step: number | null): boolean =>
	step !== null && step <= FOLLOW_UP_FROM;

export const followUpBucket = (step: number): "mid" | "high" =>
	step <= FOLLOW_UP_HIGH ? "high" : "mid";

export function centreOf(step: number): number {
	if (step === 0) {
		return SAME;
	}
	const n = Math.min(STEPS, Math.abs(step));
	const off = MAGNET + ((n - 0.5) / STEPS) * (SAME - MAGNET);
	return step < 0 ? SAME - off : SAME + off;
}

export const stepBy = (from: number | null, dir: 1 | -1): number =>
	Math.max(-STEPS, Math.min(STEPS, (from ?? 0) + dir));
