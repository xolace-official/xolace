import { Easing } from "react-native-reanimated";

export const LS = {
	az: { rowGap: 6, size: 36 },
	bottom: 140,
	card: { bar: 3, gap: 8, h: 340, mark: 40, markInset: 12, pad: 20, r: 28 },
	forYou: { dim: 0.38, flat: 0.15, gap: 10, scale: 0.88, share: 0.7 },
	gutter: 16,
	hub: {
		cover: 0.62,
		coverR: 22,
		dot: 6,
		dotGap: 8,
		dotOn: 18,
		fade: 28,
		gap: 12,
		inset: 24,
		pad: 8,
		r: 28,
	},
	hubCover: 300,
	hubFold: 250,
	kind: { art: 64, gap: 10, r: 22 },
	listen: { art: 64, artR: 16, lock: 20, padV: 8, play: 44, r: 22 },
	mark: { bottom: 7, chipAt: 6, chipH: 20, inset: 8 },
	row: {
		gap: 14,
		ix: 16,
		padV: 12,
		save: 44,
		thumbH: 78,
		thumbR: 14,
		thumbW: 104,
	},
	sectionGap: 12,
	sectionTop: 30,
} as const;

export const AX_FONT_SCALE = 1.6;

export const LT = {
	arriveBase: 120,
	arriveEase: Easing.bezier(0.33, 1, 0.68, 1),
	arriveMs: 450,
	arriveRise: 14,
	arriveStep: 80,
	barTitleMs: 220,
	barTitleRise: 4,
	holdMs: 1100,
	holdReleaseMs: 250,
	press: Easing.bezier(0.23, 1, 0.32, 1),
	pressMs: 150,
	rise: 8,
	riseMs: 240,
	rowDim: 0.7,
} as const;
