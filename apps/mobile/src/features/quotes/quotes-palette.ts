/**
 * The quote colours a `--color-quote-*` token can't express (fixed-palette note in global.css):
 * gradient stops, which `LinearGradient` takes as arrays.
 */

/** Poster's wash, at 170° (a hair off vertical, as CSS draws it). */
export const POSTER_WASH = {
	colors: ["#F9F06B", "#F7B7C8", "#B9B7B4"] as const,
	end: { x: 0.59, y: 1 },
	locations: [0, 0.62, 1] as const,
	start: { x: 0.41, y: 0 },
};

/** The scrim under light ink, top to bottom. Clear view drops it to `SCRIM_CLEAR`. */
export const SCRIM = {
	colors: [
		"rgba(0,0,0,0.36)",
		"rgba(0,0,0,0.06)",
		"rgba(0,0,0,0.24)",
		"rgba(0,0,0,0.10)",
		"rgba(0,0,0,0.52)",
	] as const,
	locations: [0, 0.2, 0.46, 0.7, 1] as const,
};
export const SCRIM_CLEAR = 0.45;
