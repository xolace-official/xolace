import { Easing } from "react-native-reanimated";

/**
 * Reflect v2's motion numbers, each from the source the handoff names (design/handoff/reflect/
 * sources.md, written S1a … S27) and re-timed to the board where the precedence table says so.
 * Seconds unless marked ms.
 */

/** S1a docking-prompt-card: a finished word warms, holds .45 s, cools over .4 s. Its colour and
 * glow are `reflect-warm` and `reflect-warm-glow` (global.css). */
export const WARM = {
	ease: Easing.bezier(0, 0, 0.58, 1),
	fadeMs: 400,
	glowR: 12,
	holdMs: 450,
} as const;

/** S1b docking-prompt-card fly: spring 130/17, 18 pt arc, 5% swell, times the 1.24 → 1 size change. */
export const FLY = {
	arc: 18,
	barOutMs: 220,
	fromScale: 1.24,
	spring: { damping: 17, mass: 1, stiffness: 130 },
	swell: 0.05,
} as const;

/** S2 hold-to-speak: the drop (ω 18, ζ .55 → k 324, c 19.8), the glow (ω 12, ζ .9), and the reach. */
export const SPEAK = {
	dropFrom: 12,
	dropSpring: { damping: 19.8, mass: 1, stiffness: 324 },
	glowReach: 110,
	glowSpring: { damping: 21.6, mass: 1, stiffness: 144 },
	heldScale: 1.08,
	restSpread: 1.7,
} as const;

/** Board `.tex.away`: the texture band folds away once anything is typed or the mic is held. */
export const TEXTURE_OUT = { drop: 10, ms: 350 } as const;
/** S18e: the nudge after a pause; board `.nudge`: 6 pt, .5 s. */
export const NUDGE = {
	dayMs: 8000,
	ms: 500,
	nightMs: 14_000,
	rise: 6,
} as const;

/** S5 brush-ink ensō, paced by the board: head = .85·(1 − e^(−t/2)), close .42 s, bleed 1 s at +.3. */
export const ENSO = {
	bleedDelayMs: 300,
	bleedMs: 1000,
	blotMs: 500,
	cap: 0.85,
	closeMs: 420,
	dryDelayMs: 1200,
	dryMs: 2400,
	dryOpacity: 0.5,
	startDeg: -155,
	sweepDeg: 332,
	tau: 2,
} as const;

/** S6 thinking-word-shimmer, slowed by the board: rise 10 pt out of 6 pt blur in .45 s, band every 1.4 s. */
export const STAGE_LINE = {
	bandMs: 1400,
	blur: 6,
	ease: Easing.bezier(0.2, 0.8, 0.2, 1),
	ms: 450,
	rise: 10,
} as const;

/** S7 ember-glow-story: words, then the lit phrases, then the surge. */
export const WRITE_IN = {
	band: 0.45,
	base: 0.15,
	flashOut: 0.5,
	heavyStagger: 0.09,
	heavyWordIn: 0.6,
	lightAfter: 0.15,
	lightIn: 0.25,
	lightStagger: 0.3,
	rise: 8,
	stagger: 0.06,
	surge: 80,
	surgeIn: 0.18,
	surgeOut: 0.9,
	wordIn: 0.25,
} as const;

/** S19c action row: 200/400/600 ms, .4 s each, rising 8 pt (board `fadeUp`). */
export const ACTIONS = {
	ease: Easing.bezier(0.455, 0.03, 0.515, 0.955),
	ms: 400,
	rise: 8,
	stepMs: 200,
} as const;
/** S19g: the read-aloud slot fills 3.6 s after landing. */
export const READ_ALOUD_AFTER_MS = 3600;
/** S8 pinch-to-summarize flash: 200 ms out with +20% height, then a 400 ms fade. */
export const FLASH = { fadeMs: 400, grow: 0.2, outMs: 200 } as const;

/** S9 swipe-reply pull: resist toward 110, arm at 40 (the owner's choice), settle 300/26. */
export const PULL = {
	activeX: 12,
	arm: 40,
	arrowFrom: 0.55,
	dim: 0.38,
	failY: 12,
	k: 0.55,
	max: 110,
	settle: { damping: 26, mass: 1, stiffness: 300 },
} as const;
/** Board `.nq`: the panel slides up in .42 s on cubic-bezier(.32,.72,0,1). */
export const PANEL = {
	ease: Easing.bezier(0.32, 0.72, 0, 1),
	ms: 420,
} as const;
/** S10 tone-rewrite: the shimmer 1.1 s, then .05 s per word. */
export const REWRITE_MOTION = {
	shimmerMs: 1100,
	startS: 1.1,
	wordS: 0.05,
} as const;

/** S12 breathing tide + board `.tide`: to 380 in 1.2 s; breathe in 2 s, hold .6 s, out 3.3 s. */
export const TIDE = {
	arch: 60,
	exhale: 3.3,
	hold: 0.6,
	inhale: 2,
	rest: 380,
	riseMs: 1200,
	top: 720,
} as const;
/** Board `.care`: rises .7 s, .5 s after the mirror has written in. */
export const CARE_IN = { after: 0.5, ms: 700, rise: 30 } as const;
/** S11 chip-morph-menu: the list grows on 247/23.4, rows 60 ms apart after 150 ms. */
export const MORPH = {
	rise: 10,
	rowMs: 400,
	rowStaggerMs: 60,
	rowsAfterMs: 150,
	spring: { damping: 23.4, mass: 1, stiffness: 247 },
} as const;

/** S13 four-elements: trace .85 s (board), lift 4 pt, tip in .04 s out .12 s; tiles at .12 + .07·i. */
export const TILES = {
	firstS: 0.12,
	goAfterMs: 1150,
	inMs: 380,
	lift: 4,
	rise: 8,
	stepS: 0.07,
	traceMs: 850,
} as const;

/** Heard (board `.s-heard`): bleed 1.4 s at .2, "Heard." .9 s at .35, line at .7, streak at .8. */
export const HEARD_MOTION = {
	bleedDelayMs: 200,
	bleedMs: 1400,
	chipDelayMs: 800,
	faceAfterMs: 600,
	restMs: 1800,
	subDelayMs: 700,
	wordDelayMs: 350,
	wordMs: 900,
} as const;

/** The face (§6 poses table): the mirror's nod, and glances. */
export const FACE_MOTION = {
	afterLitMs: 700,
	glanceMs: 1100,
	heavyNodMs: 1000,
	mirrorNodMs: 450,
} as const;

/** Phase cross-fades between stages (board `.stage`: opacity .4 s). */
export const STAGE_FADE_MS = 400;
