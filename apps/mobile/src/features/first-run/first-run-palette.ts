/**
 * First run's fixed palette (the "auth" printed-object surface in AGENTS.md): the fire, the
 * story's glows and the seat are the same night in every theme, and the promise has only its
 * own dusk and day. Kept as RGB triplets because the worklets mix them per frame and Skia
 * draws them; `css()` turns one into the string React Native and Skia take.
 */
import type { BeatId } from "./copy";

export type RGB = readonly [number, number, number];

/** `rgba(r,g,b,a)`, alpha clamped. */
export function css(c: RGB, a = 1) {
	"worklet";
	return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, Math.min(1, a))})`;
}

const WHITE: RGB = [255, 255, 255];
const INK: RGB = [243, 240, 250];
const EMBER: RGB = [245, 176, 79];

/** The promise, which follows the theme's light or dark. */
export const PROMISE_COLORS = {
	buttonShadow: "rgb(245,150,60)",
	drift: [
		"rgba(245,178,124,0.10)",
		"rgba(168,132,178,0.06)",
		"rgba(54,70,110,0.12)",
	] as const,
	ember: { day: [143, 80, 0] as RGB, dusk: EMBER },
	fireEmber: EMBER,
	gleam: { day: [232, 146, 42] as RGB, dusk: WHITE },
	gleamGlow: { day: [242, 163, 58] as RGB, dusk: [255, 196, 120] as RGB },
	/** The ground, and the night it darkens to on the hand-off. */
	ground: {
		day: [247, 245, 251] as RGB,
		dusk: [14, 12, 21] as RGB,
		night: [5, 4, 5] as RGB,
	},
	ink: { day: [25, 21, 36] as RGB, dusk: INK },
	ink2: { day: [93, 87, 110] as RGB, dusk: [176, 169, 194] as RGB },
	/** The button's label on its fill. */
	label: { day: WHITE, dusk: [23, 16, 47] as RGB },
	underglow: {
		day: [
			"rgba(242,163,58,0.26)",
			"rgba(242,163,58,0.08)",
			"rgba(242,163,58,0)",
		],
		dusk: [
			"rgba(245,150,60,0.24)",
			"rgba(245,120,40,0.08)",
			"rgba(245,120,40,0)",
		],
	},
} as const;

/** The mood cards (production's MoodCard art). */
export const MOOD_COLORS = {
	answer: [255, 217, 168] as RGB,
	card: [45, 35, 64] as RGB,
	foot: ["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"] as const,
	lift: "rgb(245,160,70)",
	word: {
		glow: "rgba(255,190,110,0.8)",
		rest: [217, 214, 221] as RGB,
		warm: [255, 230, 189] as RGB,
	},
} as const;

/** Sparks, coals and embers, shared by the hand-off, the story and the seat. */
export const FIRE_COLORS = {
	coal: [
		"rgb(255,244,220)",
		"rgb(255,244,220)",
		"rgb(255,181,74)",
		"rgba(255,140,40,0)",
	],
	ember: [247, 213, 140] as RGB,
	emberFlare: "rgba(247,190,100,1)",
	spark: "rgb(255,203,120)",
	sparkGlow: "rgba(255,160,60,0.8)",
} as const;

type BeatGlow = { hot: RGB; rim: RGB; tint: RGB; lit: RGB };

/** Each beat's glow (hot, rim, tint) and the colour its key words light to. */
export const BEAT_COLORS: Record<BeatId, BeatGlow> = {
	dusk: {
		hot: [255, 196, 122],
		lit: [255, 208, 138],
		rim: [184, 80, 26],
		tint: [42, 20, 8],
	},
	mirror: {
		hot: [200, 230, 242],
		lit: [207, 234, 245],
		rim: [47, 106, 138],
		tint: [11, 28, 38],
	},
	plus: {
		hot: [205, 187, 255],
		lit: [214, 200, 255],
		rim: [90, 60, 176],
		tint: [22, 15, 46],
	},
	proof: {
		hot: [247, 207, 122],
		lit: [247, 213, 140],
		rim: [142, 84, 16],
		tint: [36, 22, 6],
	},
	vent: {
		hot: [255, 159, 106],
		lit: [255, 179, 138],
		rim: [184, 48, 14],
		tint: [42, 13, 8],
	},
	xolacers: {
		hot: [246, 185, 168],
		lit: [248, 198, 182],
		rim: [160, 64, 90],
		tint: [38, 16, 26],
	},
};

/** The story and the seat: always night. */
export const STORY_COLORS = {
	/** Sign in with Apple's light button (HIG: a solid light fill on a dark ground). */
	apple: { fill: INK, ink: [18, 13, 20] as RGB },
	card: ["rgb(42,28,36)", "rgb(26,18,24)"] as const,
	cardEdge: "rgba(255,220,210,0.16)",
	cardShadow: "0 18px 40px -16px rgba(0,0,0,0.7)",
	count: [247, 213, 140] as RGB,
	countGlow: [247, 207, 122] as RGB,
	ember: EMBER,
	/** "Pull up a seat" once it turns solid. */
	emberInk: [30, 18, 6] as RGB,
	ground: "rgb(7,6,5)",
	ink: INK,
	knot: { fill: "rgb(122,74,42)", ring: "rgb(90,52,28)" },
	/** The log by Flux's fire, and its knot. */
	log: ["rgb(107,65,38)", "rgb(62,36,20)"] as const,
	logEdge: "rgba(255,210,160,0.18)",
	mask: "rgb(18,13,20)",
	mirrorWord: [207, 234, 245] as RGB,
	online: "rgb(143,214,160)",
	panel: {
		dot: "rgb(228,218,255)",
		fill: ["rgba(120,95,210,0.18)", "rgba(120,95,210,0.04)"],
		line: "rgb(214,200,255)",
		note: "rgb(237,230,255)",
		signal: [237, 230, 255] as RGB,
	},
	quoteDot: "rgb(255,231,176)",
	quoteDotGlow:
		"0 0 0 5px rgba(247,213,140,0.12), 0 0 16px 6px rgba(247,180,90,0.4)",
	/** The Mirror's reflection fades out under the waterline. */
	reflectMask: ["rgb(0,0,0)", "rgba(0,0,0,0)"] as const,
	ripple: "rgba(200,230,242,0.7)",
	seat: {
		hot: [255, 196, 122] as RGB,
		rim: [200, 96, 26] as RGB,
		tint: [42, 20, 8] as RGB,
	},
	seatFire: [
		"rgba(245,150,60,0.42)",
		"rgba(245,120,40,0.12)",
		"rgba(245,120,40,0)",
	],
	seatGlow: ["rgba(255,200,120,0.55)", "rgba(255,170,80,0)"],
	shoulders: "rgb(58,46,68)",
	water: "rgba(200,230,242,0.5)",
	youFill: "rgba(255,255,255,0.035)",
} as const;

/** The story's made-up Xolacers' drawn faces. */
export const FACE_COLORS = [
	{ bg: "rgb(233,185,140)", hair: "rgb(31,23,18)", skin: "rgb(139,90,67)" },
	{ bg: "rgb(183,163,255)", hair: "rgb(20,16,14)", skin: "rgb(94,59,44)" },
	{ bg: "rgb(143,195,240)", hair: "rgb(58,36,22)", skin: "rgb(192,138,104)" },
] as const;

/** Google's "G", in its brand colours (production's icon). */
export const GOOGLE_COLORS = {
	blue: "rgb(66,133,244)",
	green: "rgb(52,168,83)",
	red: "rgb(234,67,53)",
	yellow: "rgb(251,188,5)",
} as const;

/** Ink at an alpha: the story's text on the night ground. */
export function ink(a: number) {
	"worklet";
	return css(INK, a);
}
