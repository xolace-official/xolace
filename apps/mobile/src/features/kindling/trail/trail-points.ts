/**
 * The trail's points on a 390 pt phone (handoff §2.2, the board's `LEG`), for any number of
 * twigs: stops alternate right and left 136 pt apart from (322, 56), each leg is the board's
 * S-curve, and the last runs into the fire. Pure numbers, so it's tested without Skia. Wider or
 * narrower phones stretch x only (`trailGeometry`).
 */
export const DESIGN_W = 390;
export const CIRCLE = 72;
export const RADIUS = CIRCLE / 2;

const RIGHT_X = 322;
const LEFT_X = 68;
const FIRST_Y = 56;
const STEP_Y = 136;
/** A leg's control points sit half a step below its start. */
const BEND = STEP_Y / 2;
/** The fire leg: down 136, then 204 below the stop it curls in 42, ending 114 in. */
const FIRE_DROP = 136;
const FIRE_IN = 42;
const FIRE_END = 114;
const FIRE_LEVEL = 204;
/** The campfire's 3:4 box, at x 130 and 55 below the last stop, and its flame at 49% across, 86% down. */
const FIRE_BELOW = 55;
const FIRE_X = 130;
const FIRE_W = 132;
const FIRE_H = 176;
const FLAME_X = 0.49;
const FLAME_Y = 0.86;
/** How far past the fire's box the trail's own drawing reaches (the glow). */
const DRAW_PAST_FIRE = 125;
/** The board's content below the trail's top runs 269 past the fire's box. */
const BLOCK_PAST_FIRE = 269;

export type Pt = readonly [number, number];
export type Cubic = readonly [Pt, Pt, Pt, Pt];
export type FireBox = { x: number; y: number; w: number; h: number };

export type TrailPoints = {
	stops: Pt[];
	/** Each stop owns the leg that leaves it; the last runs into the fire. */
	legs: Cubic[];
	fire: FireBox;
	flame: Pt;
	/** The trail's drawing height, and the scroll block's least height under the trail's top. */
	drawH: number;
	blockH: number;
};

/** A right-hand stop: even ones (the first is on the right). */
export const isRight = (i: number) => i % 2 === 0;

export function trailPoints(count: number, sx = 1): TrailPoints {
	const n = Math.max(1, count);
	const xOf = (i: number) => (isRight(i) ? RIGHT_X : LEFT_X);
	const stops: Pt[] = Array.from({ length: n }, (_, i) => [
		xOf(i) * sx,
		FIRST_Y + STEP_Y * i,
	]);
	const legs: Cubic[] = [];
	for (let i = 0; i + 1 < n; i += 1) {
		const y = FIRST_Y + STEP_Y * i;
		const [a, b] = [xOf(i) * sx, xOf(i + 1) * sx];
		legs.push([
			[a, y],
			[a, y + BEND],
			[b, y + BEND],
			[b, y + STEP_Y],
		]);
	}
	const lastY = FIRST_Y + STEP_Y * (n - 1);
	// The board's last stop is on the left; a right-hand one mirrors the leg and the fire.
	const right = isRight(n - 1);
	const mx = (x: number) => (right ? DESIGN_W - x : x) * sx;
	const level = lastY + FIRE_LEVEL;
	legs.push([
		[mx(LEFT_X), lastY],
		[mx(LEFT_X), lastY + FIRE_DROP],
		[mx(LEFT_X + FIRE_IN), level],
		[mx(LEFT_X + FIRE_END), level],
	]);
	const flameX = mx(FIRE_X + FLAME_X * FIRE_W);
	const fire = {
		h: FIRE_H,
		w: FIRE_W,
		x: flameX - FLAME_X * FIRE_W,
		y: lastY + FIRE_BELOW,
	};
	return {
		blockH: fire.y + fire.h + BLOCK_PAST_FIRE,
		drawH: fire.y + fire.h + DRAW_PAST_FIRE,
		fire,
		flame: [flameX, fire.y + FLAME_Y * fire.h],
		legs,
		stops,
	};
}
