import type { CubicBezier } from "@/design/ease";

/** Sizes from the boards' CSS (`ExploreAlive`, `ExploreDoors`), in points. */
export const EXS = {
	/** Lists and grids clear the tab bar and the mini player. */
	bottom: 120,
	chip: { h: 40, padH: 15, r: 20 },
	lock: { glyph: 9, inset: 4, size: 18 },
	row: { art: 52, artR: 14, gap: 12, padH: 16, padV: 8 },
	/** A row's hairline runs from the text (16 + 52 + 12) to 16 from the right. */
	rule: { left: 80, right: 16 },
} as const;

/** Production's grid, with Explore's 22 pt corners and press (handoff §2). */
export const GRID = {
	artR: 22,
	gap: 12,
	gutter: 16,
	press: 0.97,
	rowGap: 16,
	textGap: 8,
	top: 8,
} as const;

/** A topic, v2 (`.cov.c2`, `.thead.h2`, `.sheet.s2`, `.fl`, `.kick`, `.ep`), below the bar. */
export const TOPIC = {
	/** Clears the tab bar and the mini player. */
	bottom: 140,
	chips: { bottom: 8, fade: 14, gap: 8, top: 14, x: 16 },
	/** The cover runs from the top of the screen to this far below the bar. */
	coverBelow: 166,
	ep: { circle: 38, gap: 14, glyph: 14, num: 24, padH: 16, padV: 12, rule: 54 },
	kick: { bottom: 6, firstTop: 12, top: 20, x: 16 },
	kindIcon: 16,
	nameBottom: 36,
	nameGap: 4,
	nameX: 20,
	sheetOverlap: 22,
	sheetR: 28,
	/** With no chips, the list starts this far below the sheet's top. */
	soloTop: 12,
	/** The spacer holding the name ends this far below the bar. */
	spacerBelow: 142,
} as const;

/** The sheet's top meets the bar here: the chips pin, and the name moves into the bar. */
export const PIN_AT = TOPIC.spacerBelow - TOPIC.sheetOverlap;

/** Half-speed parallax; a pull stretches the cover to 1.5× at −200. */
export const PARALLAX = { pull: 200, rate: 0.5, stretch: 1.5 } as const;

/** The name on the cover: the display face, 36 / 36, −0.035 em. */
export const NAME_TYPE = {
	fontSize: 36,
	letterSpacing: -1.26,
	lineHeight: 36,
} as const;

export const EX_TIMING = {
	chipMs: 220,
	/** The band behind the bar, the bar title and the cover name: 220 ms. */
	edgeMs: 220,
	rise: 8,
	riseMs: 260,
	swapInMs: 180,
	/** A chip switch: out, change, in with a rise. */
	swapOutMs: 140,
	veilInMs: 400,
	veilOutMs: 600,
} as const;

export const EX_CURVES = {
	/** (.23, 1, .32, 1): the need panel's curve. */
	panel: [0.23, 1, 0.32, 1],
	/** CSS ease-in. */
	swapOut: [0.42, 0, 1, 1],
} as const satisfies Record<string, CubicBezier>;

/** Explore home (`ExploreAlive`, handoff `explore.md` §1–§14), in points and ms. */
export const HOME_S = {
	cardGutter: 16,
	cont: { h: 76, r: 22, ring: 40, w: 286 },
	door: { glyph: 26, r: 18, size: 58, w: 76 },
	feat: { h: 212, play: 48, r: 30 },
	five: { gap: 14, snap: 332, w: 318 },
	/** Headers and shelves sit 20 in; cards and grouped lists 16. */
	gutter: 20,
	headerGap: 12,
	/** Hairlines in For the hour (from the text) and Five (from the text, no padding). */
	rule: { five: 64, hour: 80 },
	sectionTop: 26,
	shelfGap: 12,
	tile: { art: 148, artR: 22, gap: 7 },
} as const;

export const HOME_TIMING = {
	/** Choose for me's Another: out, swap at the midpoint, in. */
	anotherMs: 600,
	/** Hold to hear: held this long, a preview starts; it ends after the cap. */
	holdMs: 350,
	previewCapMs: 8000,
	/** Continue's ring fills to its place. */
	ringMs: 900,
	/** Skeleton to content: a short fade, no entrance. */
	swapMs: 200,
} as const;

export const HOME_CURVES = {
	/** Continue's ring: Easing.bezier(.33, 1, .68, 1). */
	ring: [0.33, 1, 0.68, 1],
	/** Choose for me: the in half of 1 − sin πt. */
	sineIn: [0.12, 0, 0.39, 0],
	/** Choose for me: the out half of 1 − sin πt. */
	sineOut: [0.61, 1, 0.88, 1],
} as const satisfies Record<string, CubicBezier>;

/** Fixed white-on-art colours (Featured's play and scrim), the board's. */
export const ON_ART = {
	playBg: "rgba(255,255,255,0.94)",
	playFg: "#191524",
	scrimFrom: "rgba(0,0,0,0)",
	scrimTo: "rgba(0,0,0,0.42)",
} as const;
