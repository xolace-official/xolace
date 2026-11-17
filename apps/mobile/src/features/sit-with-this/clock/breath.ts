/**
 * Production's dual breath, frame by frame (board `arcsAt`, `breathAt`), as
 * worklets.
 *
 * - Geometry: the old `dual-breath.constants.ts` and
 *   `use-dual-breath-animation.ts`, exactly: sizes as ratios of the canvas,
 *   lerped rest → peak by `p`; the pair centred vertically; the bottom shape
 *   anchored `GAP` below the top one; the wobble added to both base radii.
 * - Timings: production's `TIMINGS` (the old `paced-orb.tsx`).
 * - Easing: inhale bezier(.4, 0, .2, 1), exhale bezier(.2, 0, .1, 1), solved
 *   as the board's `bez` does (8 Newton steps).
 */
import type { BreathPattern } from "../sit-model";

export const ARC = {
	BOT_CORNERS: {
		bottomLeft: [0.98, 1.1],
		bottomRight: [1.08, 1.02],
		topLeft: [0.28, 0.3],
		topRight: [0.32, 0.26],
	},
	GAP: 14,
	SHAPE: {
		bot: {
			peak: { h: 0.54, r: 56, w: 0.86 },
			rest: { h: 0.2, r: 40, w: 0.74 },
		},
		top: {
			peak: { h: 0.32, r: 40, w: 0.74 },
			rest: { h: 0.6, r: 54, w: 0.82 },
		},
	},
	/** Corner multipliers {x, y}: tight where the arcs face each other, round outside. */
	TOP_CORNERS: {
		bottomLeft: [0.26, 0.32],
		bottomRight: [0.3, 0.26],
		topLeft: [1.02, 1.08],
		topRight: [1.1, 0.98],
	},
	WOBBLE: 6,
	WOBBLE_MS: 880,
} as const;

export type Corners = typeof ARC.TOP_CORNERS | typeof ARC.BOT_CORNERS;

/** 0 inhale, 1 top ("A little more"), 2 exhale. */
export type PhaseKind = 0 | 1 | 2;
export const INHALE: PhaseKind = 0;
export const TOP: PhaseKind = 1;
const EXHALE: PhaseKind = 2;

export type Step = readonly [PhaseKind, number];

/** [kind, ms] per step (production `TIMINGS`). */
export const PATTERNS: Record<BreathPattern, readonly Step[]> = {
	ext: [
		[INHALE, 4000],
		[EXHALE, 8000],
	],
	sigh: [
		[INHALE, 4000],
		[TOP, 1000],
		[EXHALE, 8000],
	],
	slow: [
		[INHALE, 3000],
		[EXHALE, 6000],
	],
};

export const cycleMs = (pattern: BreathPattern) =>
	PATTERNS[pattern].reduce((a, s) => a + s[1], 0);

const lerp = (a: number, b: number, t: number) => {
	"worklet";
	return a + (b - a) * t;
};

export const clamp01 = (v: number) => {
	"worklet";
	return Math.min(1, Math.max(0, v));
};

const NEWTON_STEPS = 8;
const FLAT = 1e-6;

/** The board's `bez(x1, y1, x2, y2)(x)`: a CSS cubic-bezier, x solved by Newton's method. */
export function bezier(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	x: number
): number {
	"worklet";
	if (x <= 0) {
		return 0;
	}
	if (x >= 1) {
		return 1;
	}
	const ax = 1 - 3 * x2 + 3 * x1;
	const bx = 3 * x2 - 6 * x1;
	const cx = 3 * x1;
	let t = x;
	for (let i = 0; i < NEWTON_STEPS; i++) {
		const slope = 3 * ax * t * t + 2 * bx * t + cx;
		if (Math.abs(slope) < FLAT) {
			break;
		}
		t -= (((ax * t + bx) * t + cx) * t - x) / slope;
	}
	t = clamp01(t);
	const ay = 1 - 3 * y2 + 3 * y1;
	const by = 3 * y2 - 6 * y1;
	const cy = 3 * y1;
	return ((ay * t + by) * t + cy) * t;
}

const inhaleEase = (u: number) => {
	"worklet";
	return bezier(0.4, 0, 0.2, 1, u);
};
const exhaleEase = (u: number) => {
	"worklet";
	return bezier(0.2, 0, 0.1, 1, u);
};

export type Box = { x: number; y: number; w: number; h: number; r: number };
export type Arcs = { top: Box; bot: Box; seamY: number };

/** Board `arcsAt(W, H, p, wob, gap)`: production's two rounded rects at breath progress `p`. */
export function arcsAt(
	W: number,
	H: number,
	p: number,
	wob: number,
	gap: number = ARC.GAP
): Arcs {
	"worklet";
	const S = ARC.SHAPE;
	const tH = lerp(S.top.rest.h * H, S.top.peak.h * H, p);
	const bH = lerp(S.bot.rest.h * H, S.bot.peak.h * H, p);
	const y0 = (H - tH - gap - bH) / 2;
	const tW = lerp(S.top.rest.w * W, S.top.peak.w * W, p);
	const bW = lerp(S.bot.rest.w * W, S.bot.peak.w * W, p);
	return {
		bot: {
			h: bH,
			r: lerp(S.bot.rest.r, S.bot.peak.r, p) + wob,
			w: bW,
			x: (W - bW) / 2,
			y: y0 + tH + gap,
		},
		seamY: y0 + tH + gap / 2,
		top: {
			h: tH,
			r: lerp(S.top.rest.r, S.top.peak.r, p) + wob,
			w: tW,
			x: (W - tW) / 2,
			y: y0,
		},
	};
}

export type BreathAt = {
	p: number;
	wob: number;
	/** Step index inside the cycle, −1 when done. */
	step: number;
	kind: PhaseKind;
	cycle: number;
	/** Progress through the step, 0–1. */
	u: number;
	/** ms into the step, and the step's length. */
	ms: number;
	d: number;
	done: boolean;
};

/** The top's wobble: production's 6 pt / 880 ms inside `sin(π·u)`, so 0 at both ends. */
function topWobble(u: number, ms: number): number {
	"worklet";
	const wave = 0.75 + 0.25 * Math.sin((2 * Math.PI * ms) / ARC.WOBBLE_MS);
	return ARC.WOBBLE * Math.sin(Math.PI * u) * wave;
}

/**
 * Board `breathAt(pattern, cycles, t)`: where the breath is `t` ms in. The
 * next inhale starts straight after the exhale, as production's `playCycle`.
 * The top keeps production's wobble inside noodle-net-orbit's `sin(π·hold)`
 * envelope, so the exhale starts from production's exact rest geometry
 * (handoff §0).
 */
export function breathAt(
	steps: readonly Step[],
	cycles: number,
	t: number
): BreathAt {
	"worklet";
	let at = 0;
	for (let c = 0; c < cycles; c++) {
		for (let i = 0; i < steps.length; i++) {
			const kind = steps[i][0];
			const d = steps[i][1];
			if (t < at + d) {
				const u = clamp01((t - at) / d);
				let p = 1;
				let wob = 0;
				if (kind === INHALE) {
					p = inhaleEase(u);
				} else if (kind === TOP) {
					wob = topWobble(u, t - at);
				} else {
					p = 1 - exhaleEase(u);
				}
				return {
					cycle: c,
					d,
					done: false,
					kind,
					ms: t - at,
					p,
					step: i,
					u,
					wob,
				};
			}
			at += d;
		}
	}
	return {
		cycle: cycles,
		d: 0,
		done: true,
		kind: EXHALE,
		ms: 0,
		p: 0,
		step: -1,
		u: 1,
		wob: 0,
	};
}

/** Board `smooth`: exponential approach with time constant `tau` ms. */
export function approach(
	cur: number,
	target: number,
	dt: number,
	tau: number
): number {
	"worklet";
	return cur + (target - cur) * (1 - Math.exp(-dt / tau));
}
