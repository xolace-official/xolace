/**
 * The boards' motion maths as worklets (`BadgesAlive` / `ArrivalsAlive`): every
 * value the badge page and the arrival draw is a pure function of ages in ms,
 * stepped by one frame callback per screen. Shared by `badges/` and `arrival/`.
 */
export const TAU = Math.PI * 2;

export function clamp(v: number, lo = 0, hi = 1) {
	"worklet";
	return Math.min(hi, Math.max(lo, v));
}

export function lerp(a: number, b: number, t: number) {
	"worklet";
	return a + (b - a) * t;
}

/** Where `t` is between `a` and `b`, 0–1. */
export function seg(t: number, a: number, b: number) {
	"worklet";
	return clamp((t - a) / (b - a));
}

/** Ease-out cubic. */
export function easeOut(t: number) {
	"worklet";
	return 1 - (1 - clamp(t)) ** 3;
}

/** Ease-in-out cubic. */
export function easeIO(t: number) {
	"worklet";
	const x = clamp(t);
	return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/**
 * An underdamped spring from 0 to 1, `t` seconds in: `w` its angular frequency,
 * `z` its damping ratio. Different stiffness on x, y and size makes the flight's curve.
 */
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

/** A damped bounce that starts and ends at 0 (native-cook confetti-gather-badge). */
export function bounce(x: number) {
	"worklet";
	return x <= 0 || x >= 1 ? 0 : Math.sin(x * Math.PI * 2.5) * Math.exp(-4 * x);
}

/** The board's seeded hash: the same confetti every time (task-toast-confetti). */
export function hash(i: number, k: number) {
	const x = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43_758.5453;
	return x - Math.floor(x);
}

/** Which face is up: true when the back shows. */
export function showsBack(spin: number) {
	"worklet";
	return Math.abs(Math.round(spin / Math.PI)) % 2 === 1;
}
