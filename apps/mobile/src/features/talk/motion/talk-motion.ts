import {
	Easing,
	Extrapolation,
	interpolate,
	type WithTimingConfig,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";

export const LAYOUT = {
	button: 44,
	captionBelow: 188,
	carouselPad: 8,
	composerGap: 8,
	composerH: 44,
	face: 172,
	fieldLeft: 68,
	footBottom: 41,
	footGap: 12,
	footH: 17,
	glowInset: 26,
	gutter: 16,
	headerTop: 2,
	helpAbove: 50,
	minFace: 120,
	pillFace: 34,
	pillFaceDx: -65,
	pillH: 46,
	pillTop: 1,
	pillW: 176,
	presenceBelow: 122,
	slot: 150,
	stageCentre: 372,
	stageFace: 195,
	startH: 56,
	switchH: 34,
	switchTop: 56,
	switchW: 280,
	titleTop: 52,
} as const;

export const BOARD = { height: 844, home: 34, status: 54 } as const;

export const OUT_EASE = Easing.bezierFn(0.2, 0.8, 0.2, 1);
export const ENTER_EASE = Easing.bezierFn(0.23, 1, 0.32, 1);
export const PILL_EASE = Easing.bezierFn(0.4, 0, 0.2, 1);
export const IN_EASE = Easing.in(Easing.quad);

export const GO = {
	dropBy: 10,
	fieldIn: 280,
	fieldInMs: 250,
	fillAt: 100,
	fillMs: 300,
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
	reduced: REDUCED_FADE_MS,
	switchAt: 340,
	toPill: 520,
} as const;

export const INTRO = { gap: 70, groups: 5, length: 420, rise: 8 } as const;

export const GLOW = {
	high: 0.62,
	loopMs: 1400,
	low: 0.34,
	restMs: 400,
	scale: 1.08,
	startRest: 0.36,
	talkRest: 0.22,
} as const;

const STIFFNESS = 220;
const DAMPING_RATIO = 0.74;
export const SNAP = {
	damping: DAMPING_RATIO * 2 * Math.sqrt(STIFFNESS),
	flickDistance: 75,
	flickVelocity: 450,
	mass: 1,
	rubber: 0.3,
	stiffness: STIFFNESS,
} as const;

const LINEAR = Easing.linear;

export function timing(
	duration: number,
	easing?: WithTimingConfig["easing"]
): WithTimingConfig {
	"worklet";
	return { duration, easing: easing ?? LINEAR, ...PLAY_AS_CHOSEN };
}

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
