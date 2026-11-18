import { PULL } from "../motion";

/** Smoothstep of `x` between `a` and `b` (ember-glow-story's `smooth`). */
export function smooth(x: number, a: number, b: number): number {
	"worklet";
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
}

/** Cubic ease-out of `x`, clamped to 0…1. */
export function easeOut(x: number): number {
	"worklet";
	const u = 1 - Math.min(1, Math.max(0, x));
	return 1 - u * u * u;
}

/** 0…1 progress of `x` through `from` … `from + span`. */
export function progress(x: number, from: number, span: number): number {
	"worklet";
	return Math.min(1, Math.max(0, (x - from) / span));
}

/** S9 swipe-reply: the pull approaches `PULL.max` and never reaches it. */
export function resist(d: number): number {
	"worklet";
	const travelled = Math.max(0, d) * PULL.k;
	return (1 - 1 / (travelled / PULL.max + 1)) * PULL.max;
}
