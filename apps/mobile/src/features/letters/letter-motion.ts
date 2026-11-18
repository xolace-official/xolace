import { REDUCED_FADE_MS } from "@/design/springs";

type Bezier = [number, number, number, number];

/** Letters' curves, as cubic-bezier tuples (Reanimated `Easing.bezier(...)`, or Ease as is). */
const LETTER_CURVES = {
	/** The arrival, and the glow's first ignite step (ease-out cubic). */
	arrive: [0.33, 1, 0.68, 1] as Bezier,
	/** Hide's drift (≈ ζ .9). */
	drift: [0.2, 0.8, 0.2, 1] as Bezier,
	/** The stamp's drop. */
	drop: [0.55, 0, 1, 0.45] as Bezier,
	/** The fold, the unfold and the rise. */
	fold: [0.65, 0, 0.35, 1] as Bezier,
	/** Label rolls, the care sheet, words rising, the stamp settling. */
	roll: [0.23, 1, 0.32, 1] as Bezier,
};

/**
 * Letters (handoff `letters.md` §5): every timing, curve and distance, in one place; the
 * prototype's `LETTER_MOTION`, whole. Motion stays on the UI thread and moves only transform and
 * opacity, and nothing moves at rest: the one repeat (the glow, while the check runs) stops the
 * moment it answers. That glow is the one loop, so it's the one thing on Ease; every state
 * change (fades, slides, the fold, the drag, the rise, the seal, the stamp) is on Reanimated.
 * Reduce Motion: every move is a 200 ms crossfade and every action still works. Durations in
 * ms, distances in pt, angles in degrees.
 */
export const LETTER_MOTION = {
	/** Arrive: once, from the fire's side, through a midpoint, to rest. No loop after. */
	arrive: {
		from: { rotate: -8, scale: 0.22, x: -110, y: 90 },
		ms: 900,
		via: { x: -48, y: -6 },
	},
	/** Fixable, held, not English: drain, unfold top then bottom, edit with the words intact. */
	back: {
		bottomAtMs: 900,
		drainMs: 600,
		editAtMs: 1200,
		lineFadeMs: 200,
		stepMs: 300,
		topAtMs: 600,
	},
	/** While the check runs: 1 ↔ .85, 1.2 s each way, stopped the moment it answers. */
	breathe: { halfMs: 1200, low: 0.85 },
	curves: LETTER_CURVES,
	/** Wait: fold in thirds, bottom then top, rotateX at this perspective. */
	fold: { perspective: 900, stepMs: 300 },
	/** Hide: drift aside (110% of its width) and fade. Never a crumple. */
	hide: { ms: 420, rotate: 4, x: 1.1 },
	/** The ember glow and the received mark's ignite: 0 → .5 → .3 → 1, 800 ms in all. */
	ignite: [
		{ ms: 150, to: 0.5 },
		{ ms: 100, to: 0.3 },
		{ ms: 550, to: 1 },
	],
	/** "Send" rolls to "Reading it over…". */
	label: { delayMs: 120, ms: 320, rise: 6 },
	/** The received mark: lights once along the ignite curve, then stays lit. */
	mark: { igniteMs: 800, ring: 1.5, size: 12 },
	/** Open: drag progress = up-distance / dragPt. */
	open: {
		bottomMs: 300,
		commitAt: 0.42,
		/** The creases fade as the words rise, once (open question 29). */
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
	/** At risk: the letter rests folded; the care sheet rises. */
	risk: { sheetAtMs: 400, sheetMs: 320 },
	/** Pass: shrink to an ember, rise and sway, three sparks; the line comes in at +2 s. */
	send: {
		glowDrainMs: 600,
		lineAtMs: 2000,
		rise: { delayMs: 300, fadeTail: 0.2, ms: 1600, sway: 12, y: -560 },
		shrink: { ms: 400, scale: 0.15 },
		sparks: { atMs: [500, 700, 900], ms: 1100 },
	},
	/** Acknowledge: the ember disc drops, squashes and settles, turning −16° → −6°. */
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
	/** Write: starters fade in; nothing else moves. */
	starters: { fadeMs: 200 },
} as const;
