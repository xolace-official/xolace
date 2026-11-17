/**
 * Sit with this's layout, sizes and light, from the board's `<style>`
 * (design/boards/SitAlive.dc.html), in the board's points (390 × 844, a 47 pt
 * status bar). Top values go through `useBoardY`; bottom values keep their
 * distance above the screen's bottom edge. Colours are tokens
 * (`arcs/sit-colors.ts`).
 */
import type { ArcSize } from "./sit-model";

export const LAYOUT = {
	/** `.arcs`: 390 × 480 at top 128; 480 is the height at 844 tall. */
	arcs: { boardHeight: 844, height: 480, top: 128 },
	caption: { side: 34, syncTop: 614, top: 620 },
	cta: { beginBottom: 88, doneBottom: 34, height: 56, side: 16 },
	hand: { side: 34, top: 578 },
	header: { button: 44, face: 40, side: 16, top: 54 },
	line: { side: 30, top: 478 },
	link: { bottom: 30, height: 44 },
	pausedChip: { height: 30, top: 128 },
	pre: { gap: 8, side: 24, top: 470 },
	stayed: { side: 24, top: 612 },
	thread: { gap: 4, height: 3, side: 28, top: 110 },
	write: {
		fieldH: 182,
		fieldSide: 16,
		fieldTop: 204,
		headTop: 130,
		lockTop: 396,
		side: 24,
	},
} as const;

/** The board's inner height (status bar and home indicator off): the arcs scale below it. */
export const BOARD_INNER = LAYOUT.arcs.boardHeight - 47 - 34;

/** `.arcs.small/.mid/.gone`: the whole canvas moves on one spring. */
export const SIZES: Record<
	ArcSize,
	{ y: number; scale: number; opacity: number }
> = {
	full: { opacity: 1, scale: 1, y: 0 },
	gone: { opacity: 0, scale: 0.32, y: -150 },
	mid: { opacity: 1, scale: 0.74, y: -22 },
	small: { opacity: 1, scale: 0.5, y: -34 },
};
/** Critically damped over 900 ms: GLIDE's shape, slowed down (handoff §4). */
export const SIZE_SPRING = { dampingRatio: 1, duration: 900 } as const;

/** `.arcs` opacity .6 s; `.blk` .4 s; `.swl` .6 s; the label's fade .4 s. */
export const FADE = {
	arcsMs: 600,
	blockMs: 400,
	labelMs: 400,
	linkMs: 600,
} as const;

/** The light: card-light's edge pill, the board's seam, wash, floor and rim. */
export const LIGHT = {
	coreStops: [0, 0.25, 0.75, 1],
	edge: {
		below: 30,
		blur: 22,
		h: 40,
		high: 0.6,
		inset: 40,
		lateHigh: 0.34,
		lateLow: 0.12,
		low: 0.2,
	},
	/** The floor light reaches .35 → .80 of the bottom arc as you breathe in. */
	reach: { by: 0.45, from: 0.35, mid: 0.45 },
	rimBlur: 2,
	rimBlurW: 4,
	rimOpacity: 0.9,
	rimR: 0.42,
	rimStops: [0, 0.45, 1],
	rimW: 1.5,
	/** cipher-seam's three layers, tamed (handoff §4): height, blur, alpha. */
	seam: [
		{ alpha: 0.38, blur: 14, core: false, h: 26 },
		{ alpha: 0.9, blur: 4, core: false, h: 8 },
		{ alpha: 0.6, blur: 0.5, core: true, h: 1.6 },
	],
	seamInset: 24,
	seamStops: [0, 0.2, 0.45, 0.7, 1],
	seamStopsLate: [0, 0.3, 0.7, 1],
	/** The wash over the top arc fades out at .7 of it. */
	washTo: 0.7,
} as const;

/** The sky wash at the top (board `.sky`): Reflect's, at .38 of its .6 by day. */
export const SKY_SCALE = 0.38 / 0.6;
