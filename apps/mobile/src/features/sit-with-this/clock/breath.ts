import { ARC } from "@/design/breath-arc";
import type { BreathPattern } from "../sit-model";

export type PhaseKind = 0 | 1 | 2;
export const INHALE: PhaseKind = 0;
export const TOP: PhaseKind = 1;
const EXHALE: PhaseKind = 2;

export type Step = readonly [PhaseKind, number];

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

export const clamp01 = (v: number) => {
	"worklet";
	return Math.min(1, Math.max(0, v));
};

const NEWTON_STEPS = 8;
const FLAT = 1e-6;

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

export type BreathAt = {
	p: number;
	wob: number;
	step: number;
	kind: PhaseKind;
	cycle: number;
	u: number;
	ms: number;
	d: number;
	done: boolean;
};

function topWobble(u: number, ms: number): number {
	"worklet";
	const wave = 0.75 + 0.25 * Math.sin((2 * Math.PI * ms) / ARC.WOBBLE_MS);
	return ARC.WOBBLE * Math.sin(Math.PI * u) * wave;
}

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

export function approach(
	cur: number,
	target: number,
	dt: number,
	tau: number
): number {
	"worklet";
	return cur + (target - cur) * (1 - Math.exp(-dt / tau));
}
