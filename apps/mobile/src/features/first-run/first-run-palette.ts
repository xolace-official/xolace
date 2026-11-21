import type { BeatId } from "./copy";

export type RGB = readonly [number, number, number];

export function css(c: RGB, a = 1) {
	"worklet";
	return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, Math.min(1, a))})`;
}

const WHITE: RGB = [255, 255, 255];
const INK: RGB = [243, 240, 250];
const EMBER: RGB = [245, 176, 79];

export const PROMISE_COLORS = {
	ember: { day: [143, 80, 0] as RGB, dusk: EMBER },
	fireEmber: EMBER,
	gleam: { day: [232, 146, 42] as RGB, dusk: WHITE },
	gleamGlow: { day: [242, 163, 58] as RGB, dusk: [255, 196, 120] as RGB },
	ground: {
		day: [247, 245, 251] as RGB,
		dusk: [14, 12, 21] as RGB,
		night: [5, 4, 5] as RGB,
	},
	ink: { day: [25, 21, 36] as RGB, dusk: INK },
	ink2: { day: [93, 87, 110] as RGB, dusk: [176, 169, 194] as RGB },
	label: { day: WHITE, dusk: [23, 16, 47] as RGB },
} as const;

export const MOOD_COLORS = {
	answer: [255, 217, 168] as RGB,
	card: [45, 35, 64] as RGB,
	word: {
		rest: [217, 214, 221] as RGB,
		warm: [255, 230, 189] as RGB,
	},
} as const;

type BeatGlow = { hot: RGB; rim: RGB; tint: RGB; lit: RGB };

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

export const STORY_COLORS = {
	/** Sign in with Apple's light button (HIG: a solid light fill on a dark ground). */
	apple: { fill: INK, ink: [18, 13, 20] as RGB },
	count: [247, 213, 140] as RGB,
	countGlow: [247, 207, 122] as RGB,
	ember: EMBER,
	emberInk: [30, 18, 6] as RGB,
	ink: INK,
	mirrorWord: [207, 234, 245] as RGB,
	panel: {
		signal: [237, 230, 255] as RGB,
	},
	seat: {
		hot: [255, 196, 122] as RGB,
		rim: [200, 96, 26] as RGB,
		tint: [42, 20, 8] as RGB,
	},
} as const;

export function ink(a: number) {
	"worklet";
	return css(INK, a);
}
