import {
	Easing,
	Extrapolation,
	interpolate,
	type WithTimingConfig,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";

/**
 * Talk's numbers (handoff §2, §4, §6), from the board's 390 × 844 phone with a 54 pt status
 * bar. Layout is flex around these gaps, so the groups keep them on other heights.
 */
export const LAYOUT = {
	button: 44,
	captionBelow: 188,
	carouselPad: 8,
	composerGap: 8,
	/** The composer: 44 tall, 8 above the safe area; the field runs from 68 to 16. */
	composerH: 44,
	face: 172,
	fieldLeft: 68,
	footBottom: 41,
	footGap: 12,
	footH: 17,
	glowInset: 26,
	gutter: 16,
	/** Header circles: 44 pt, 2 pt under the status bar; the title starts 52 pt under it. */
	headerTop: 2,
	/** "Get help now" sits 50 pt above the composer's top. */
	helpAbove: 50,
	minFace: 120,
	pillFace: 34,
	/** The pill's face centre sits this far left of the screen's centre (107 + 6 + 17 − 195). */
	pillFaceDx: -65,
	pillH: 46,
	/** The talk: the title pill, the switch and the stage (face 195, half the board's width). */
	pillTop: 1,
	pillW: 176,
	presenceBelow: 122,
	/** The carousel: slots 150 apart, the centred face 172 (down to 120 with large text). */
	slot: 150,
	/** The stage's face centre on the board (y 372), and the presence word / caption below it. */
	stageCentre: 372,
	stageFace: 195,
	/** Under the start button: gap to the footnote, the footnote, and its gap to the safe area. */
	startH: 56,
	switchH: 34,
	switchTop: 56,
	switchW: 280,
	titleTop: 52,
} as const;

/** The board phone the numbers above are measured on. */
export const BOARD = { height: 844, home: 34, status: 54 } as const;

export const OUT_EASE = Easing.bezierFn(0.2, 0.8, 0.2, 1);
export const ENTER_EASE = Easing.bezierFn(0.23, 1, 0.32, 1);
export const PILL_EASE = Easing.bezierFn(0.4, 0, 0.2, 1);
export const IN_EASE = Easing.in(Easing.quad);

/** Start → talk, in ms on one timeline (§6). */
export const GO = {
	dropBy: 10,
	fieldIn: 280,
	fieldInMs: 250,
	fillAt: 100,
	fillMs: 300,
	/** The footnote goes first and fast: the button passes over its place. */
	footFade: 100,
	groupsDrop: 260,
	groupsFade: 200,
	groupsGap: 30,
	hero: 500,
	labelOut: 160,
	length: 1000,
	morph: 440,
	muteAt: 300,
	muteFade: 250,
	muteScale: 400,
	neighbours: 160,
	pillAt: 260,
	pillFade: 300,
	pillMove: 400,
	presenceAt: 300,
	/** Reduce Motion: everything cross-fades in place within this. */
	reduced: REDUCED_FADE_MS,
	switchAt: 340,
	toPill: 520,
} as const;

/** The entrance cascade: each group fades up 8 pt, 70 ms apart, over 420 ms (§2.8). */
export const INTRO = { gap: 70, groups: 5, length: 420, rise: 8 } as const;

/** Speaking (§5): the glow breathes 0.34 ↔ 0.62 and 1 ↔ 1.08 every 1.4 s, then rests. */
export const GLOW = {
	high: 0.62,
	loopMs: 1400,
	low: 0.34,
	restMs: 400,
	scale: 1.08,
	startRest: 0.36,
	talkRest: 0.22,
} as const;

/** The carousel's snap (native-cook `mood-character-dial`): stiffness 220, damping ratio 0.74. */
const STIFFNESS = 220;
const DAMPING_RATIO = 0.74;
export const SNAP = {
	damping: DAMPING_RATIO * 2 * Math.sqrt(STIFFNESS),
	flickDistance: 75,
	/** A flick: fast and short moves one look. */
	flickVelocity: 450,
	mass: 1,
	rubber: 0.3,
	stiffness: STIFFNESS,
} as const;

/** A timing that plays as the screen chose (it already took reduced motion into account). */
const LINEAR = Easing.linear;

export function timing(
	duration: number,
	easing?: WithTimingConfig["easing"]
): WithTimingConfig {
	"worklet";
	return { duration, easing: easing ?? LINEAR, ...PLAY_AS_CHOSEN };
}

/** 0 → 1 over [start, start + length] on a timeline, eased. */
export function seg(
	t: number,
	start: number,
	length: number,
	ease: (x: number) => number = (x) => x
) {
	"worklet";
	return ease(
		interpolate(t, [start, start + length], [0, 1], Extrapolation.CLAMP)
	);
}
