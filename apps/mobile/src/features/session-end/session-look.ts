import { Easing } from "react-native-reanimated";

/**
 * After a session v2's numbers, from the live board (design/boards/AfterAlive.dc.html): its `<style>`
 * for layout, colour and timing, its script for the logic. Board points (390 × 844, a 47 pt status
 * bar): tops go through Reflect's `useBoardY`, bottoms keep their distance above the screen's bottom.
 */
export const LAYOUT = {
	/** `.av i`: 40, a 3 pt card ring, −10 overlap; the figure 37 tall, 3 from the top. */
	avatar: { figure: 37, figureTop: 3, overlap: -10, ring: 3, size: 40 },
	/** `.cst2`: a 390 × 90 band at 96; you at (195, 62). */
	band: { h: 90, top: 96, w: 390 },
	/** `.lv` 20 above; `.cd` radius 26, padding 20 / 20 / 16; `.q` 19.5/27; `.cap` 8 above 12.5/17; `.row` 14 above, 46. */
	card: {
		button: 15.5,
		cap: 12.5,
		capLine: 17,
		capTop: 8,
		dot: 9,
		dotGap: 9,
		gap: 8,
		padBottom: 16,
		padTop: 20,
		padX: 20,
		quote: 19.5,
		quoteLine: 27,
		radius: 26,
		row: 46,
		rowTop: 14,
		top: 20,
	},
	/** `.dchip`: centred, 62 down, 32 tall, padding 0 13 0 10, gap 6; 700 13.5; the digits' 18 pt window. */
	chip: {
		gap: 6,
		height: 32,
		icon: 14,
		padLeft: 10,
		padRight: 13,
		size: 13.5,
		top: 62,
		window: 18,
	},
	/** `.w2col` 194 (nothing to share 150), 16 in; `.t2` 14 in, 800 28/32, −.028em; `.sub2` 8 / 26, 15.5/22. */
	col: { noneTop: 150, side: 16, top: 194 },
	/** `.cta`: 16 in, 34 up (moment 2: 84), 56 tall; `.cta2` 34 up, 44 tall, 600 15.5 violet ink. */
	cta: {
		another: 44,
		anotherSize: 15.5,
		bottom: 34,
		bottom2: 84,
		cross: 8,
		height: 56,
		side: 16,
		size: 17,
	},
	/** `.ends`: 34 in, 610; 14 ink 2. `.ns`: 640, 120 × 44, radius 22, 600 15. */
	ends: { side: 34, size: 14, top: 610 },
	/** `.fstage`: 176 at (107, 282); the header slot is centred on (195, 76): translateY −294, scale .2273. */
	face: { headerScale: 0.2273, headerY: -294, size: 176, top: 282 },
	/** `.wash`: −70 each side, 150 down, 440 tall. */
	light: { blur: 36, height: 440, side: -70, top: 150 },
	/** `.nxl` 26 / 6 (nothing to share 30), 600 13; `.nxc` 10 above, 76 tall, radius 22, 0 16, gap 14. */
	next: {
		chevron: 18,
		gap: 14,
		height: 76,
		icon: 44,
		iconRadius: 14,
		label: 13,
		labelNoneTop: 30,
		labelSide: 6,
		labelTop: 26,
		padX: 16,
		radius: 22,
		sub: 13.5,
		subLine: 18,
		title: 16,
		titleLine: 21,
		top: 10,
	},
	notSure: { h: 44, size: 15, top: 640, w: 120 },
	private: { line: 19, size: 14, top: 214 },
	/** `.q1` 188 (late 186, 400 17/24 ink 2); `.pv` 214, 14/19 ink 3. */
	question: { lateSize: 17, lateTop: 186, line: 24, size: 18, top: 188 },
	/** `.fsh`: 124 × 18 at 462. */
	shadow: { h: 18, top: 462, w: 124 },
	sub2: { line: 22, side: 26, size: 15.5, top: 8 },
	/** `.t1`: 28 in, 108 down; Bricolage 800 30/33, −.03em. */
	title: { line: 33, side: 28, size: 30, top: 108, tracking: -0.9 },
	title2: { line: 32, side: 14, size: 28, tracking: -0.78 },
	/** `.trk` 30 in, 552, 56 tall; `.rail` 20 in, 23 down, 10 tall; `.notch` 2 × 24 at 16; `.thumb` 40 at 8. */
	track: {
		height: 56,
		inset: 20,
		notchH: 24,
		notchTop: 16,
		notchW: 2,
		rail: 10,
		railTop: 23,
		side: 30,
		thumb: 40,
		thumbTop: 8,
		top: 552,
	},
	unsure: { side: 30, size: 14, top: 532 },
	/** `.wd`: 492, 38 tall, Newsreader 30/38 (before an answer 24 ink 3). `.unh` 532, 30 in, 14 ink 2. */
	word: { height: 38, idle: 24, size: 30, top: 492 },
} as const;

/** The board's timeline in ms (its keyframe delays and durations). */
export const T1 = {
	chip: { at: 150, from: 0.6, ms: 450 },
	cta: { at: 1300, ms: 400 },
	end: 3200,
	ends: { at: 1200, ms: 500 },
	faceDown: { at: 50, ms: 750 },
	light: { at: 300, ms: 800 },
	notSure: { at: 1250, ms: 500 },
	/** Before any touch, the thumb nudges once: 0 → −12 (30%) → +8 (62%) → 0 over 1.1 s. */
	nudge: { a: -12, at: 2000, b: 8, ms: 1100 },
	private: { at: 950, ms: 500 },
	question: { at: 850, ms: 500, rise: 14 },
	roll: { at: 600, ms: 500 },
	shadow: { at: 550, ms: 400 },
	title: { at: 200, step: 160 },
	track: { at: 1120, ms: 500, rise: 14 },
	turn: 1050,
	word: { at: 1050, ms: 500, rise: 14 },
} as const;

export const T2 = {
	another: { at: 500, ms: 400 },
	/** The caption 380 ms after the last word starts; the row 100 ms later; .4 s each. */
	caption: { after: 380, ms: 400 },
	card: { at: 820, ms: 620, opaqueAt: 0.4, rise: 28 },
	/** `.cta` bottom 34 → 84 (.45 s); `.cta2` fades .4 s after .5 s; the labels cross-roll .25 / .3 s. */
	cta: { ms: 450 },
	end: 4200,
	/** The face to the header: .62 s after .08 s. */
	face: { at: 80, ms: 620 },
	label: { fade: 250, move: 300 },
	next: { at: 1380, ms: 600, rise: 28 },
	nextLabel: { at: 1300, ms: 400 },
	none: { drop: 6, ms: 350 },
	/** Moment 1's content: out with a 10 pt drop over .22 s. */
	out: { drop: 10, ms: 220 },
	row: { after: 100, ms: 400 },
	slot: { at: 600, ms: 600 },
	/** Stars 0–3 pop in at .35 s + k·.08 s, k = 2, 0, 1, 3. */
	stars: { at: 350, k: [2, 0, 1, 3], ms: 500, step: 80 },
	sub: { at: 750, ms: 500 },
	title: { at: 420, step: 160 },
	/** `wordsOf`: each word at 820 + 160 + line · 260 + (column / 36) · 420. */
	write: { at: 820, cpl: 36, lead: 160, line: 260, sweep: 420 },
} as const;

/** Sending: t = 0 at the tap (or the ready release). */
export const TS = {
	blink: { lead: 550, ms: 900, per: 240 },
	buttons: 200,
	dim: { after: 300, ms: 800 },
	end: 4200,
	floor: { ms: 1300 },
	gleam: { col: 9, line: 120, ms: 550, peak: 0.4 },
	land: 1500,
	lines: { fade: 450, lead: 50, ms: 600, step: 60 },
	lit: { lead: 350, ms: 600, per: 600 },
	me: { fade: 300, ms: 550 },
	point: { at: 380, ms: 1150 },
	/** Reduce Motion: your star and the lines cross-fade over 200 ms at 350 ms. */
	reducedLand: 350,
	reducedWatch: 1600,
	slotOut: 500,
	status: 400,
	watch: 2900,
} as const;

/** Holding the card (paper-lantern-confirm's hold): ready at 700 ms. */
export const HOLD = {
	edge: { held: 0.26, ms: 700, ready: 0.36 },
	label: { fade: 220, move: 280, rise: 14 },
	lift: { ms: 500, scale: 1.015, y: -3 },
	light: { ms: 700 },
	readyMs: 700,
} as const;

/** The slider (production `use-mood-slider.ts` + the board's `.trk` transitions). */
export const SLIDER = {
	activeX: 4,
	/** Not sure: the track dims to .4 over .3 s; the line shows .3 s. */
	dim: 0.4,
	dimMs: 300,
	failY: 14,
	/** A tap: the thumb glides there, 140 ms, cubic-bezier(.5, 1, .89, 1). */
	glideMs: 140,
	/** While held: the rail ×1.5 in Y (exertion-spectrum-slider SWELL 300/21), the thumb 1.12 over 120 ms. */
	swell: 1.5,
	swellSpring: { damping: 21, mass: 1, stiffness: 300 },
	thumbBackMs: 180,
	thumbMs: 120,
	thumbScale: 1.12,
	/** The word swaps with a fade + 8 pt rise over .24 s. */
	word: { ms: 240, rise: 8 },
} as const;

/** The float, shadow and light follow u = (pos − .5) · 2 (board `.fmv`, `.fsh`, `.wash i`). */
export const FOLLOW = {
	/** The bob: −(2 + 5 · max(0, u)) pt on 3.6 s (late 6.7 s), ease-in-out. */
	bob: { base: 2, lateMs: 6700, lift: 5, ms: 3600 },
	/** The header's breath (peers-chrome `FACE_BREATH`) at 40 pt: rise 1.5, scale 3% / 6%. */
	breath: { rise: 1.5, sx: 0.03, sy: 0.06 },
	floatDown: 12,
	/** "Spring it, about 10% overshoot": ζ ≈ .6 over the board's .6 s. */
	floatSpring: { dampingRatio: 0.6, duration: 600 },
	floatUp: 24,
	lightDragMs: 150,
	lightMs: 400,
	neutralA: 0.85,
	shadowA: 0.85,
	shadowADown: 0.15,
	shadowAMs: 500,
	shadowAUp: 0.5,
	shadowDown: 0.2,
	shadowUp: 0.38,
} as const;

export const EASE = {
	blink: Easing.bezierFn(0.2, 0.8, 0.2, 1),
	card: Easing.bezierFn(0.34, 1.18, 0.64, 1),
	css: Easing.bezierFn(0.25, 0.1, 0.25, 1),
	easeOut: Easing.bezier(0, 0, 0.58, 1),
	faceDown: Easing.bezierFn(0.34, 1.18, 0.5, 1),
	faceUp: Easing.bezierFn(0.34, 1.12, 0.5, 1),
	glide: Easing.bezier(0.5, 1, 0.89, 1),
	inOut: Easing.bezierFn(0.42, 0, 0.58, 1),
	label: Easing.bezier(0.2, 0.8, 0.2, 1),
	lift: Easing.bezier(0.34, 1.3, 0.55, 1),
	line: Easing.bezierFn(0.45, 0, 0.25, 1),
	lit: Easing.bezier(0.2, 0.6, 0.3, 1),
	nudge: Easing.bezierFn(0.4, 0, 0.2, 1),
	pop: Easing.bezierFn(0.34, 1.56, 0.64, 1),
	rise: Easing.bezierFn(0.2, 0.8, 0.2, 1),
	roll: Easing.bezierFn(0.3, 1.3, 0.5, 1),
	sheet: Easing.bezier(0.32, 0.72, 0, 1),
	sheetFn: Easing.bezierFn(0.32, 0.72, 0, 1),
	star: Easing.bezierFn(0.34, 1.4, 0.64, 1),
	/** `glA` and `wo`: the title's and the quote's words. */
	write: Easing.bezierFn(0.33, 1, 0.68, 1),
} as const;

/** Reduce Motion: things cross-fade over 200 ms. */
export const REDUCED_MS = 200;
