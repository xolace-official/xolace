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

const MAX_STEP_MS = 100;

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

export type Stage = { W: number; H: number; dx: number; dy: number };
