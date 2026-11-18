/**
 * First run's easing and layout helpers, as worklets. The promise and the story port their board's
 * `scene()` on top of these: every value on screen is a pure function of ages in ms. Positions are
 * the board's 390 × 844 phone, moved under the real status bar (`Stage`).
 */
import type { RGB } from "./first-run-palette";

export const TAU = Math.PI * 2;

export function clamp(v: number, a = 0, b = 1) {
	"worklet";
	return Math.min(b, Math.max(a, v));
}
export function lerp(a: number, b: number, t: number) {
	"worklet";
	return a + (b - a) * t;
}
/** Where `t` is between `a` and `b`, 0..1. */
export function seg(t: number, a: number, b: number) {
	"worklet";
	return clamp((t - a) / (b - a));
}
export function ease(t: number) {
	"worklet";
	return 1 - (1 - clamp(t)) ** 3;
}
export function ease4(t: number) {
	"worklet";
	return 1 - (1 - clamp(t)) ** 4;
}
export function easeIO(t: number) {
	"worklet";
	const x = clamp(t);
	return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}
export function smooth(a: number, b: number, x: number) {
	"worklet";
	const t = clamp((x - a) / (b - a));
	return t * t * (3 - 2 * t);
}
/** A spring's step response at t seconds, ω w, damping ratio z (the boards' `fs`). */
export function fs(t: number, w: number, z: number) {
	"worklet";
	if (t <= 0) {
		return 0;
	}
	const wd = w * Math.sqrt(1 - z * z);
	return (
		1 -
		Math.exp(-z * w * t) *
			(Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t))
	);
}
export function mod(a: number, n: number) {
	"worklet";
	return ((a % n) + n) % n;
}
/** Reanimated's `interpolate`, extending past its ends. */
export function interp(
	x: number,
	xs: readonly number[],
	ys: readonly number[]
) {
	"worklet";
	let i = 0;
	while (i < xs.length - 2 && x > xs[i + 1]) {
		i++;
	}
	return ys[i] + ((x - xs[i]) / (xs[i + 1] - xs[i])) * (ys[i + 1] - ys[i]);
}
export function mixRGB(a: RGB, b: RGB, t: number): RGB {
	"worklet";
	return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** The board's phone. */
/** The longest step the engines' clock takes in one frame. */
const MAX_STEP_MS = 100;

/**
 * The engines' clock: the first frame's timestamp, then each frame's step (at most
 * `MAX_STEP_MS`). A clock that skipped frames while its scene was settled resumes where it stopped,
 * so a tap stamped with the paused time still plays its fade instead of jumping past it.
 */
export function nextNow(
	now: number,
	frame: { timestamp: number; timeSincePreviousFrame: number | null }
) {
	"worklet";
	if (now === 0) {
		return frame.timestamp;
	}
	return now + Math.min(MAX_STEP_MS, frame.timeSincePreviousFrame ?? 16);
}

export const BOARD = { h: 844, status: 54, w: 390 } as const;

/** The screen, against the board: `dy` moves board tops under the real status bar. */
export type Stage = { W: number; H: number; dx: number; dy: number };
