/** ThinkingOrb worklet maths; runs on the UI thread once per dot per frame. */

/** Ink levels the dots round to: one animated prop per bucket per frame. Below ~6 bands, above
 * ~12 no gain. */
export const BUCKETS = 8;

/** Ink below this is invisible against any background, so it is not drawn. */
const MIN_INK = 0.03;

/** Dots never shrink past this, or a far dot becomes a gap in the lattice. */
const MIN_RADIUS = 0.3;

/** Density and speed per state. `sm` is a separate design, not `md` scaled: fewer, larger,
 * faster dots. */
export interface Profile {
	/** Dots around a row. */
	density: number;
	/** Multiplier on every dot radius. */
	radius: number;
	/** Lattice rows, orbit count, ribbon lanes — whatever the mode counts by. */
	rows: number;
	speed: number;
}

/** Deterministic hash in `[0, 1)`. Stable across frames and across mounts. */
export function hashD(a: number, b: number): number {
	"worklet";
	const h = Math.sin(a * 12.9898 + b * 78.233) * 43_758.5453;
	return h - Math.floor(h);
}

/** Shortest signed angular distance, wrapped to `(-π, π]`. */
export function angleDelta(a: number, b: number): number {
	"worklet";
	return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

/** One decimal place. Path strings are rebuilt every frame; every digit costs. */
function q(value: number): number {
	"worklet";
	return Math.round(value * 10) / 10;
}

/** Radii were tuned at 300pt; sub-linear scaling keeps 20pt from smudging and 96pt from beading. */
export function radiusScale(size: number): number {
	"worklet";
	return (size / 300) ** 0.6;
}

/** A dot as two half-arcs appended to its ink bucket, so a bucket stays one node. */
export function dot(
	out: string[],
	x: number,
	y: number,
	r: number,
	ink: number
): void {
	"worklet";
	if (ink < MIN_INK) {
		return;
	}
	const bucket = Math.min(BUCKETS - 1, Math.max(0, Math.floor(ink * BUCKETS)));
	const rr = q(Math.max(MIN_RADIUS, r));
	const d = q(rr * 2);
	out[bucket] +=
		`M${q(x - rr)} ${q(y)}a${rr} ${rr} 0 1 0 ${d} 0a${rr} ${rr} 0 1 0 ${-d} 0`;
}

/** Spin, tilt and orthographic projection into a caller-owned scratch triple (no per-dot
 * allocation). */
export function project(
	out: number[],
	x: number,
	y: number,
	z: number,
	sy: number,
	cy: number,
	st: number,
	ct: number,
	ox: number,
	oy: number,
	scale: number
): void {
	"worklet";
	const x1 = x * cy + z * sy;
	const z1 = -x * sy + z * cy;
	const y1 = y * ct - z1 * st;
	out[0] = ox + x1 * scale;
	out[1] = oy - y1 * scale;
	out[2] = y * st + z1 * ct;
}
