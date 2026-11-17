import { EASE, REDUCED_MS } from "./session-look";

/**
 * The board's CSS animations as pure worklets of one clock (ms since the moment began), the way
 * Peers' arrival works: every piece reads the same value, so they stay in step to the frame, a
 * Review pace slows them all, and nothing runs once the clock stops.
 */
export const clamp01 = (x: number) => {
	"worklet";
	return Math.min(1, Math.max(0, x));
};

/**
 * One entrance at `at` for `ms`: `p` its linear progress, `opacity` on CSS `ease`. Under Reduce
 * Motion every entrance is a 200 ms fade at the same time (board `.rm`: `fadeOnly .2s`).
 */
export function appear(
	clock: number,
	at: number,
	ms: number,
	reduced: boolean
) {
	"worklet";
	if (reduced) {
		const f = clamp01((clock - at) / REDUCED_MS);
		return { opacity: f, p: 1 };
	}
	const p = clamp01((clock - at) / ms);
	return { opacity: EASE.css(p), p };
}

/** `riseIn`: 14 pt up and in, .5 s, cubic-bezier(.2, .8, .2, 1) (opacity on the same curve). */
export function riseIn(
	clock: number,
	at: number,
	ms: number,
	dy: number,
	reduced: boolean
) {
	"worklet";
	if (reduced) {
		return {
			opacity: clamp01((clock - at) / REDUCED_MS),
			transform: [{ translateY: 0 }],
		};
	}
	const e = EASE.rise(clamp01((clock - at) / ms));
	return {
		opacity: clock < at ? 0 : e,
		transform: [{ translateY: dy * (1 - e) }],
	};
}

/** `rise` (the card and the next card): 28 pt on the curve, opaque by 40%. */
export function cardRise(
	clock: number,
	at: number,
	ms: number,
	dy: number,
	opaqueAt: number,
	reduced: boolean
) {
	"worklet";
	if (reduced) {
		return {
			opacity: clamp01((clock - at) / REDUCED_MS),
			transform: [{ translateY: 0 }],
		};
	}
	const u = clamp01((clock - at) / ms);
	return {
		opacity: clock < at ? 0 : clamp01(EASE.card(clamp01(u / opaqueAt))),
		transform: [{ translateY: dy * (1 - EASE.card(u)) }],
	};
}
