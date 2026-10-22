/**
 * ThinkingOrb — worklet maths.
 *
 * Everything here runs on the UI thread, once per dot per frame. See
 * `thinking-orb.tsx` for how the buckets and the projection fit together.
 */

/**
 * How many ink levels the dots are rounded to.
 *
 * This is the dial. Every bucket is one animated prop and one path per frame,
 * so fewer is cheaper and more is smoother; below about six the depth falloff
 * starts to band visibly, and above about twelve there is nothing left to see.
 */
export const BUCKETS = 8;

/** Ink below this is invisible against any background, so it is not drawn. */
const MIN_INK = 0.03;

/** Dots never shrink past this, or a far dot becomes a gap in the lattice. */
const MIN_RADIUS = 0.3;

/**
 * Density and speed per state, at the two scales.
 *
 * `sm` is not `md` scaled down. Below about thirty pixels a faithful lattice
 * turns to grey mush, so the small orb is a separate design: far fewer dots,
 * each proportionally much larger, running faster so the motion still reads at
 * a size where the individual dots barely do.
 *
 * The counts are lower than a canvas implementation would use, because every
 * dot here is arc commands in a path string built each frame — the cost is in
 * the string, not in the fill.
 */
export interface Profile {
  speed: number;
  /** Lattice rows, orbit count, ribbon lanes — whatever the mode counts by. */
  rows: number;
  /** Dots around a row. */
  density: number;
  /** Multiplier on every dot radius. */
  radius: number;
}

/** Deterministic hash in `[0, 1)`. Stable across frames and across mounts. */
export function hashD(a: number, b: number): number {
  'worklet';
  const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

/** Shortest signed angular distance, wrapped to `(-π, π]`. */
export function angleDelta(a: number, b: number): number {
  'worklet';
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

/** One decimal place. Path strings are rebuilt every frame; every digit costs. */
function q(value: number): number {
  'worklet';
  return Math.round(value * 10) / 10;
}

/**
 * Dot radii were tuned against a 300pt frame; scaling them sub-linearly is what
 * keeps a 20pt orb from becoming a smudge and a 96pt one from becoming beads.
 */
export function radiusScale(size: number): number {
  'worklet';
  return (size / 300) ** 0.6;
}

/**
 * A dot, straight into its ink bucket as a circle of arcs.
 *
 * Two half-arcs rather than a `<Circle>`, because a bucket has to be one node:
 * the entire point of bucketing is that the frame costs eight prop writes and
 * not two hundred.
 */
export function dot(
  out: string[],
  x: number,
  y: number,
  r: number,
  ink: number
): void {
  'worklet';
  if (ink < MIN_INK) return;
  const bucket = Math.min(BUCKETS - 1, Math.max(0, Math.floor(ink * BUCKETS)));
  const rr = q(Math.max(MIN_RADIUS, r));
  const d = q(rr * 2);
  out[bucket] += `M${q(x - rr)} ${q(y)}a${rr} ${rr} 0 1 0 ${d} 0a${rr} ${rr} 0 1 0 ${-d} 0`;
}

/**
 * Spin, tilt and orthographic projection, written into a scratch triple.
 *
 * It writes into an array the caller owns rather than returning one, because it
 * is called once per dot per frame — a fresh triple each time is a few hundred
 * allocations a frame for a value read immediately and thrown away.
 */
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
  'worklet';
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const y1 = y * ct - z1 * st;
  out[0] = ox + x1 * scale;
  out[1] = oy - y1 * scale;
  out[2] = y * st + z1 * ct;
}
