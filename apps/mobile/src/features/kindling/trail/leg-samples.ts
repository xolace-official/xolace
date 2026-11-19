import { type Cubic, type Pt, RADIUS } from "./trail-points";

/**
 * Points sampled evenly along a leg by length, with normals (fuse-burn's `makeFuse`): the burn
 * reads a place on the road from these on the UI thread. Pure numbers, so it's tested without Skia.
 */
export const LEG_SAMPLES = 240;
/** Fine steps along the curve's own parameter, before resampling by length. */
const FINE = 1200;
/** The spark appears 2 pt outside a stop's disc. */
const EDGE = RADIUS + 2;

export type LegRun = {
	xs: number[];
	ys: number[];
	/** A normal pointing up and out of the road: sparks are thrown along it. */
	nx: number[];
	ny: number[];
	length: number;
	/** Where the leg leaves its stop's disc, and where it enters the next (1 for the fire). */
	u0: number;
	u1: number;
};

const bez = (a: number, b: number, c: number, d: number, t: number) => {
	const s = 1 - t;
	return s * s * s * a + 3 * s * s * t * b + 3 * s * t * t * c + t * t * t * d;
};
const bezD = (a: number, b: number, c: number, d: number, t: number) => {
	const s = 1 - t;
	return 3 * s * s * (b - a) + 6 * s * t * (c - b) + 3 * t * t * (d - c);
};

/** The leg from stop `from` to `to` (null: into the fire), sampled by length. */
export function sampleLeg(
	[a, b, c, d]: Cubic,
	from: Pt,
	to: Pt | null
): LegRun {
	const at = (t: number): Pt => [
		bez(a[0], b[0], c[0], d[0], t),
		bez(a[1], b[1], c[1], d[1], t),
	];
	// Cumulative length at each fine step.
	const ts: number[] = [0];
	const ls: number[] = [0];
	let prev = at(0);
	for (let k = 1; k <= FINE; k += 1) {
		const t = k / FINE;
		const p = at(t);
		ts.push(t);
		ls.push((ls[k - 1] ?? 0) + Math.hypot(p[0] - prev[0], p[1] - prev[1]));
		prev = p;
	}
	const length = ls[FINE] || 1;
	const run: LegRun = { length, nx: [], ny: [], u0: 0, u1: 1, xs: [], ys: [] };
	let k = 0;
	for (let i = 0; i < LEG_SAMPLES; i += 1) {
		const u = i / (LEG_SAMPLES - 1);
		const want = u * length;
		while (k < FINE - 1 && (ls[k + 1] ?? 0) < want) {
			k += 1;
		}
		const span = (ls[k + 1] ?? length) - (ls[k] ?? 0) || 1;
		const t = (ts[k] ?? 0) + (want - (ls[k] ?? 0)) / span / FINE;
		const [x, y] = at(Math.min(1, t));
		const dx = bezD(a[0], b[0], c[0], d[0], t);
		const dy = bezD(a[1], b[1], c[1], d[1], t);
		const dl = Math.hypot(dx, dy) || 1;
		// The tangent turned a quarter, whichever way points up.
		const up = dx >= 0;
		run.xs.push(x);
		run.ys.push(y);
		run.nx.push((up ? dy : -dy) / dl);
		run.ny.push((up ? -dx : dx) / dl);
		if (Math.hypot(x - from[0], y - from[1]) < EDGE) {
			run.u0 = u;
		}
		if (to && run.u1 === 1 && Math.hypot(x - to[0], y - to[1]) < EDGE) {
			run.u1 = u;
		}
	}
	return run;
}

/** A point on a leg at u (0…1): [x, y, normal x, normal y] (fuse-burn's `fuseAt`). */
export function legAt(l: LegRun, u: number): [number, number, number, number] {
	"worklet";
	const k = Math.min(1, Math.max(0, u)) * (LEG_SAMPLES - 1);
	const i = Math.min(LEG_SAMPLES - 2, Math.floor(k));
	const f = k - i;
	const lerp = (v: number[]) =>
		(v[i] ?? 0) + ((v[i + 1] ?? 0) - (v[i] ?? 0)) * f;
	return [lerp(l.xs), lerp(l.ys), lerp(l.nx), lerp(l.ny)];
}
