/**
 * You're not alone's numbers, from the live board (design/boards/PeersAlive.dc.html):
 * its `<style>` for layout, its script's `STAR`, `CARD_STAR` and `T`, and the
 * mark's SVG for the line paths. Board points (390 × 844, a 47 pt status bar):
 * tops go through `useBoardY`, bottoms keep their distance above the screen's
 * bottom edge. Colours are tokens (`peers-colors.ts`).
 */

export const LAYOUT = {
	/** `.band` 150 tall (`.s-none .band` 236, the drawing 64 lower). */
	band: { boardW: 390, height: 150, noneHeight: 236, noneShift: 64 },
	/** `.nx`: 22 below the last card (None yet 30), 44 at the sides, 14/1.45 ink 2, an 8 pt dot 10 above. */
	bridge: {
		dot: 8,
		gap: 10,
		line: 20.3,
		noneTop: 30,
		side: 44,
		size: 14,
		top: 22,
	},
	/** `.cd`: radius 26, padding 20 / 20 / 14. */
	card: { padBottom: 14, padTop: 20, padX: 20, radius: 26 },
	/** `.cards`: 24 above, 16 at the sides; `.cw` 12 apart. */
	cards: { gap: 12, side: 16, top: 24 },
	/** `.row` 14 below the quote; `.chip` 36 tall, radius 18, padding 14 / 11, gap 8, label 13.5/600. */
	chip: {
		coreInset: 2.5,
		gap: 8,
		glyph: 15,
		height: 36,
		label: 13.5,
		labelLine: 18,
		padLeft: 11,
		padRight: 14,
		ring: 1.6,
		top: 14,
	},
	/** `.ft` 168 tall, clear → page at 44%; `.cta` 56 tall, 16 in, 56 up; `.hint` 26 up, 13 ink 3. */
	footer: {
		bottom: 56,
		fade: 168,
		fadeAt: 0.44,
		height: 56,
		hint: 13,
		hintBottom: 26,
		side: 16,
	},
	/** `.hd`: 44 tall at 54, 16 in; the face 40 (`.fbr`). */
	header: { button: 44, face: 40, side: 16, top: 54 },
	/** `.q`: Newsreader italic 19.5/27; clamp 7 with "Read more" (`.more` 14/500 ink 3, 4 above). */
	quote: { clamp: 7, line: 27, moreSize: 14, moreTop: 4, size: 19.5 },
	/** `.scr`: padding 100 / 176. */
	scroll: { bottom: 176, top: 100 },
	/** `.sub`: 8 above, 40 at the sides, 15.5/1.45 ink 2. */
	sub: { line: 22.5, side: 40, size: 15.5, top: 8 },
	/** `.ttl`: 4 above, 30 at the sides; Bricolage 800 30/32, −.03em. */
	title: { line: 32, side: 30, size: 30, top: 4, tracking: -0.9 },
	/** `.topf`: 118 tall, page to 58%, then clear; shows .3 s once the scroll passes 6. */
	topFade: { after: 6, height: 118, ms: 300, solidTo: 0.58 },
} as const;

/** Board `T` (ms): the title's words .16 s apart from 120; cards 420 apart from 560. */
export const T = { first: 560, step: 420, title: 120, tStep: 160 } as const;

/** The motion around `T`, from the board's keyframes and transitions. */
export const MOTION = {
	/** A reason picked: the sheet closes, then the card leaves. */
	afterSheetMs: 380,
	/** `.cta`, `.hint` fade .45 s. */
	doneMs: 450,
	/** `heard` pose, back after 1.3 s. */
	heardMs: 1300,
	/** `.cw.gone`: .42 s on the iOS sheet curve, opacity .25 s. */
	leaveFadeMs: 250,
	leaveMs: 420,
	/** Loading shows only if the results take longer than this. */
	loadingAfterMs: 300,
	/** Face `watch` this long after the last card lands. */
	readAfter: 1500,
	/** `rise`: 28 pt, opaque by 40% of .62 s; believe-card-carousel's spring (ω 17.3, ζ .81). */
	rise: { from: 28, ms: 620, omega: 17.3, opaqueAt: 0.4, zeta: 0.81 },
	/** `.sub` fades .5 s after .5 s. */
	subDelay: 500,
	subMs: 500,
	/** `.ttl .tw` glA .7 s. */
	wordMs: 700,
} as const;

/** The mark (board script `STAR`, `CARD_STAR`; the SVG's `d` attributes), in the board's 390-wide band. */
export const YOU = { x: 195, y: 122 } as const;
export const STAR = [
	[70, 66],
	[148, 30],
	[246, 36],
	[322, 72],
] as const;
/** Each line's quadratic control point (`M195 122 Q124 110 70 66`, …). */
export const CTRL = [
	[124, 110],
	[163, 84],
	[230, 88],
	[270, 112],
] as const;
/** Card i lights star `CARD_STAR[i]`: the tile's two upper circles first, then the outer two. */
export const CARD_STAR = [1, 2, 0, 3] as const;
/** The most cards the screen shows (production's `MATCH_LIMIT`, and `listRecent`'s 4). */
export const MAX_CARDS = 4;
/** Where Where next's tile circles sit (`--mx`, `--my`): s1 and s2 start there. */
export const MARK_AT: readonly (readonly [number, number] | null)[] = [
	null,
	[173.4, 93.2],
	[216.6, 93.2],
	null,
];

export const DRAW = {
	/** `.bk` r 12. */
	blink: 12,
	core: 5.2,
	coreA: 0.62,
	/** `.lk` 1.2 α .62 / hot 1.9 α 1. */
	coreHotW: 1.9,
	coreW: 1.2,
	/** `.lines.dot .lk`: dashes .006 / .022 of the length, α .5 (hot .95). */
	dash: [0.006, 0.022],
	dotA: 0.5,
	dotHotA: 0.95,
	/** `.lg` 4.5 blur 3 α .3 / hot 6 α .62. */
	glowA: 0.3,
	glowBlur: 3,
	glowHotA: 0.62,
	glowHotW: 6,
	glowW: 4.5,
	/** `.st .hl` r 22 (α .75 → 0), `.co` r 5.2; you r 30 / 7. */
	halo: 22,
	/** `.st .hl` .55, hot 1 at 1.35×. */
	haloA: 0.55,
	hotScale: 1.35,
	/** `.pl`: a 7 pt point. */
	pl: 3.5,
	/** `.st.mk .co`: rings r 9, stroke 2, ink 3 at .5. */
	ring: 9,
	ringA: 0.5,
	ringW: 2,
	youCore: 7,
	youHalo: 30,
} as const;

export const TIMING = {
	/** `.bk` .9 s at .6 s + distance / 240 pt/s (firefly-swarm `WAVE_SPEED`). */
	blink: 900,
	blinkLead: 600,
	bloom: 550,
	bloomAt: 420,
	bloomFade: 300,
	cool: 700,
	draw: 600,
	fadeIn: 450,
	gone: 400,
	halo: 500,
	hotOn: 450,
	/** `ldb` 1.5 s; delays s1 0, you .2, s2 .4 (board `--ld`). */
	load: 1500,
	morph: 400,
	move: 700,
	/** `.pl` .62 s, in over 12%, out over the last 15%. */
	pl: 620,
	/** `ring` 3.2 s, the second half a cycle later; scale 3.4. */
	ring: 3200,
	wave: 240,
} as const;

/** The point of light's glows (radii 14.5 and 27.5, α .9 and .45). */
export const POINT = {
	farA: 0.45,
	farR: 27.5,
	nearA: 0.9,
	nearR: 14.5,
} as const;

/** The lit card (board `.cd .lit`, `.cw .edge`). */
export const CARD_LIGHT = {
	/** A pill 40 in from each side, its bottom 10 below the card's, 40 tall, blurred 22, behind it. */
	edge: {
		below: 10,
		blur: 22,
		/** `edgeB` .18 ↔ .26 (late .12 ↔ .18) on the shared breath. */
		dayA: [0.18, 0.26],
		height: 40,
		inset: 40,
		lateA: [0.12, 0.18],
		offMs: 700,
		onMs: 450,
	},
	/** A radial 120% × 80% of the card at 78% / 118%, inside the card, under the text. */
	inner: {
		cx: 0.78,
		cy: 1.18,
		offMs: 700,
		onMs: 450,
		positions: [0, 0.42, 0.68],
		rx: 1.2,
		ry: 0.8,
	},
} as const;

/** The chip's motion (`.lt .chip`, `.gly`, `.lab`). */
export const CHIP = {
	/** ember-motion `beat()` 80 ms after the press. */
	beatDelay: 80,
	beatMs: 430,
	coreMs: 350,
	labelMs: 300,
	labelRise: 6,
	ms: 450,
} as const;

/** The sky wash (board `.sky`): Reflect's, at .38 in the evening. */
export const SKY_SCALE = 0.38 / 0.6;
