import type { CubicBezier } from "@/design/ease";

export const EXS = {
	bottom: 120,
	chip: { h: 40, padH: 15, r: 20 },
	lock: { glyph: 9, inset: 4, size: 18 },
	row: { art: 52, artR: 14, gap: 12, padH: 16, padV: 8 },
	rule: { left: 80, right: 16 },
} as const;

export const GRID = {
	artR: 22,
	gap: 12,
	gutter: 16,
	press: 0.97,
	rowGap: 16,
	textGap: 8,
	top: 8,
} as const;

export const TOPIC = {
	bottom: 140,
	chips: { bottom: 8, fade: 14, gap: 8, top: 14, x: 16 },
	coverBelow: 166,
	ep: { circle: 38, gap: 14, glyph: 14, num: 24, padH: 16, padV: 12, rule: 54 },
	kick: { bottom: 6, firstTop: 12, top: 20, x: 16 },
	kindIcon: 16,
	nameBottom: 36,
	nameGap: 4,
	nameX: 20,
	sheetOverlap: 22,
	sheetR: 28,
	soloTop: 12,
	spacerBelow: 142,
} as const;

export const PIN_AT = TOPIC.spacerBelow - TOPIC.sheetOverlap;

export const PARALLAX = { pull: 200, rate: 0.5, stretch: 1.5 } as const;

export const NAME_TYPE = {
	fontSize: 36,
	letterSpacing: -1.26,
	lineHeight: 36,
} as const;

export const EX_TIMING = {
	chipMs: 220,
	edgeMs: 220,
	rise: 8,
	riseMs: 260,
	swapInMs: 180,
	swapOutMs: 140,
	veilInMs: 400,
	veilOutMs: 600,
} as const;

export const EX_CURVES = {
	panel: [0.23, 1, 0.32, 1],
	swapOut: [0.42, 0, 1, 1],
} as const satisfies Record<string, CubicBezier>;

export const HOME_S = {
	cardGutter: 16,
	cont: { h: 76, r: 22, ring: 40, w: 286 },
	door: { glyph: 26, r: 18, size: 58, w: 76 },
	feat: { h: 212, play: 48, r: 30 },
	five: { gap: 14, snap: 332, w: 318 },
	gutter: 20,
	headerGap: 12,
	rule: { five: 64, hour: 80 },
	sectionTop: 26,
	shelfGap: 12,
	tile: { art: 148, artR: 22, gap: 7 },
} as const;

export const HOME_TIMING = {
	anotherMs: 600,
	holdMs: 350,
	previewCapMs: 8000,
	ringMs: 900,
	swapMs: 200,
} as const;

export const HOME_CURVES = {
	ring: [0.33, 1, 0.68, 1],
	sineIn: [0.12, 0, 0.39, 0],
	sineOut: [0.61, 1, 0.88, 1],
} as const satisfies Record<string, CubicBezier>;

export const ON_ART = {
	playBg: "rgba(255,255,255,0.94)",
	playFg: "#191524",
	scrimFrom: "rgba(0,0,0,0)",
	scrimTo: "rgba(0,0,0,0.42)",
} as const;
