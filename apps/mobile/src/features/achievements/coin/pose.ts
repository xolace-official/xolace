/** A held badge's radius on the badge page (board `.coin`: 250 pt). */
export const HELD_R = 125;
/** The coin's drawn size; flight scales it by `r / HELD_R`. */
export const COIN_D = HELD_R * 2;

/** A point and a radius on screen. */
export type Pt = { x: number; y: number; r: number };
/** Where the title grows from: a point and its scale against the title's size. */
export type NamePt = { x: number; y: number; s: number };

/**
 * Everything the coin, its colour and the page around it draw, at one frame.
 * The badge page and the arrival each compute one from their own clock.
 */
export type Pose = {
	/** The coin's centre and radius. */
	cx: number;
	cy: number;
	r: number;
	/** rotateY in radians: a multiple of π shows a face, odd ones the back. */
	spin: number;
	tiltX: number;
	tiltY: number;
	/** A locked badge's rattle (rotateZ). */
	roll: number;
	/** How far the list behind has sunk back, 0–1. */
	recede: number;
	/** How far the family colour has poured out, 0–1. */
	spread: number;
	/** The colour's strength while it's pulled down (1 → .3). */
	power: number;
	/** The title's opacity while it's pulled down. */
	nameA: number;
	bloom: number;
	/** The band of light crossing the face: 0–1 while it crosses, −1 otherwise. */
	band: number;
	nx: number;
	ny: number;
	ns: number;
	/** The whole page's opacity (Reduce Motion's cross-fade). */
	alpha: number;
	/** The scrim over the list. */
	dim: number;
	/** Each reveal's opacity and rise, by `RV`. */
	rvA: number[];
	rvY: number[];
	/** ms since landing, for the motes; −1 before or without them. */
	mt: number;
};

/** The badge page's reveal order: line, date or progress, sparks, hint, Share, back and Pin. */
export const RV = {
	chrome: 5,
	date: 1,
	hint: 3,
	line: 0,
	share: 4,
	sparks: 2,
} as const;
const REVEALS = Object.keys(RV).length;

/** Nothing out: the list at rest, the page empty. */
export const REST_POSE: Pose = {
	alpha: 0,
	band: -1,
	bloom: 0,
	cx: 0,
	cy: 0,
	dim: 0,
	mt: -1,
	nameA: 0,
	ns: 1,
	nx: 0,
	ny: 0,
	power: 0,
	r: HELD_R,
	recede: 0,
	roll: 0,
	rvA: Array.from({ length: REVEALS }, () => 0),
	rvY: Array.from({ length: REVEALS }, () => 0),
	spin: 0,
	spread: 0,
	tiltX: 0,
	tiltY: 0,
};
