import { REDUCED_FADE_MS } from "@/design/springs";

type Bezier = [number, number, number, number];

const LETTER_CURVES = {
	arrive: [0.33, 1, 0.68, 1] as Bezier,
	drift: [0.2, 0.8, 0.2, 1] as Bezier,
	drop: [0.55, 0, 1, 0.45] as Bezier,
	fold: [0.65, 0, 0.35, 1] as Bezier,
	roll: [0.23, 1, 0.32, 1] as Bezier,
};

export const LETTER_MOTION = {
	arrive: {
		from: { rotate: -8, scale: 0.22, x: -110, y: 90 },
		ms: 900,
		via: { x: -48, y: -6 },
	},
	back: {
		bottomAtMs: 900,
		drainMs: 600,
		editAtMs: 1200,
		lineFadeMs: 200,
		stepMs: 300,
		topAtMs: 600,
	},
	breathe: { halfMs: 1200, low: 0.85 },
	curves: LETTER_CURVES,
	fold: { perspective: 900, stepMs: 300 },
	hide: { ms: 420, rotate: 4, x: 1.1 },
	ignite: [
		{ ms: 150, to: 0.5 },
		{ ms: 100, to: 0.3 },
		{ ms: 550, to: 1 },
	],
	label: { delayMs: 120, ms: 320, rise: 6 },
	mark: { igniteMs: 800, ring: 1.5, size: 12 },
	open: {
		bottomMs: 300,
		commitAt: 0.42,
		crease: { ms: 420, rest: 0.08 },
		dragPt: 320,
		flapMs: 300,
		flapUntil: 0.33,
		flickVy: -900,
		seal: { fadeMs: 300, rotateLeft: -17, rotateRight: 21, shift: 12 },
		shut: { damping: 18, stiffness: 260 },
		splitAt: 0.07,
		words: { ms: 320, rise: 16, staggerMs: 80 },
	},
	reducedMs: REDUCED_FADE_MS,
	risk: { sheetAtMs: 400, sheetMs: 320 },
	send: {
		glowDrainMs: 600,
		lineAtMs: 2000,
		rise: { delayMs: 300, fadeTail: 0.2, ms: 1600, sway: 12, y: -560 },
		shrink: { ms: 400, scale: 0.15 },
		sparks: { atMs: [500, 700, 900], ms: 1100 },
	},
	stamp: {
		dropMs: 230,
		from: 1.4,
		rotateFrom: -16,
		rotateTo: -6,
		settleMs: 200,
		size: 56,
		squash: 1.06,
		squashMs: 80,
	},
	starters: { fadeMs: 200 },
} as const;
