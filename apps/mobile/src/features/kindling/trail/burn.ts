import { type LegRun, legAt } from "./leg-samples";
import { type Pt, RADIUS } from "./trail-points";

/**
 * The tend's clock (handoff §4), ported from native-cook's `fuseBurnMotion.ts`: every value is a
 * closed-form function of the time since the tend (`τ`, seconds), so the UI thread draws each
 * frame from one clock and React never renders per frame.
 *
 *   0.00 – 0.40   a match flares where the leg leaves the tended stop; the stop lights.
 *   0.25 – +D     the burn point runs the leg (easeInOut2), D = clamp(length / 230 pt/s, 1.2, 1.7 s).
 *                 Gold behind it, an ember, smoke.
 *   A             arrival: a burst and a flash on the next stop, or, with nothing left waiting,
 *                 the spark rides on into the fire (420 pt/s) and it catches there.
 */
export const BURN_AT = 0.25;
const BURN_SPEED = 230;
const BURN_MIN = 1.2;
const BURN_MAX = 1.7;
const RIDE_SPEED = 420;
/** The ride eases in over this long, then holds its speed. */
const RIDE_EASE = 0.25;
const FLARE_S = 0.4;
const SPARK_IN = 0.15;
export const SPARK_FADE = 0.12;
export const SMOKE_FADE = 0.6;
/** Bursts last this long (fuse: `burstAge < 0.9`). */
export const BURST_LIFE = 0.9;
/** The spark hides as it passes under a disc, over 6 pt either side of its edge. */
const UNDER = 6;

export const END = { catch: 2, fire: 1, stop: 0 } as const;

/** What the burn reads of the trail: the legs' samples, the stops and the flame. */
export type BurnTrail = {
	runs: readonly LegRun[];
	stops: readonly Pt[];
	flame: Pt;
};

export type Burn = {
	/** The trail clock (s) at the tend. */
	t0: number;
	/** The tended stop, whose own leg burns; −1 when the fire catches in place (§5). */
	leg: number;
	d: number;
	/** Legs the spark rides after its own, into the fire. */
	ride: number[];
	rideLen: number;
	rideD: number;
	end: (typeof END)[keyof typeof END];
};

function clamp01(x: number) {
	"worklet";
	return Math.min(1, Math.max(0, x));
}
export function seg(t: number, a: number, b: number) {
	"worklet";
	return clamp01((t - a) / (b - a));
}
function easeOut(x: number) {
	"worklet";
	const u = 1 - clamp01(x);
	return 1 - u * u * u;
}
/** Quadratic in-out: catches slowly, speeds up, eases into the next stop. */
function easeInOut2(x: number) {
	"worklet";
	const u = clamp01(x);
	return u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
}
export function hash(i: number) {
	"worklet";
	const s = Math.sin(i * 12.9898 + 78.233) * 43_758.5453;
	return s - Math.floor(s);
}

/** The burn for tending stop `i`; `toFire` when nothing is left waiting after it. */
export function planBurn(
	trail: BurnTrail,
	i: number,
	t0: number,
	toFire: boolean
): Burn {
	const own = trail.runs[i];
	const len = own ? own.length * (own.u1 - own.u0) : BURN_SPEED;
	const d = Math.min(BURN_MAX, Math.max(BURN_MIN, len / BURN_SPEED));
	const last = trail.runs.length - 1;
	const ride: number[] = [];
	if (toFire) {
		for (let j = i + 1; j <= last; j += 1) {
			ride.push(j);
		}
	}
	const rest = own ? own.length * (1 - own.u1) : 0;
	const rideLen = ride.length
		? rest + ride.reduce((s, j) => s + (trail.runs[j]?.length ?? 0), 0)
		: 0;
	const rideD = rideLen ? rideLen / RIDE_SPEED + RIDE_EASE / 2 : 0;
	let end: Burn["end"] = END.stop;
	if (toFire) {
		end = END.catch;
	} else if (i === last) {
		end = END.fire;
	}
	return { d, end, leg: i, ride, rideD, rideLen, t0 };
}

/** The fire catches where it is: the last waiting twig was passed (§5). */
export const planCatch = (t0: number): Burn => ({
	d: 0,
	end: END.catch,
	leg: -1,
	ride: [],
	rideD: 0,
	rideLen: 0,
	t0,
});

/**
 * The most burns in flight at once on a trail of `stops`: one on each stop's own leg (a stop is
 * tended once, and a refused tend's burn is taken back), and a catch in place.
 */
export const maxBurns = (stops: number) => stops + 1;

/** Seconds from the tend to the arrival (the burst). */
export function arrivalOf(b: Burn) {
	"worklet";
	return b.leg < 0 ? 0 : BURN_AT + b.d + b.rideD;
}

/** Seconds from the tend until nothing of it is drawn. */
export const lifeOf = (b: Burn) =>
	arrivalOf(b) + Math.max(BURST_LIFE, SMOKE_FADE);

/** Where the burn has reached on its own leg (u), or −1 once it has burnt through. */
export function burnU(trail: BurnTrail, b: Burn, tau: number) {
	"worklet";
	const l = trail.runs[b.leg];
	if (!l || tau >= BURN_AT + b.d) {
		return -1;
	}
	return l.u0 + (l.u1 - l.u0) * easeInOut2(seg(tau, BURN_AT, BURN_AT + b.d));
}

/** The spark's place at τ: [x, y, normal x, normal y, leg, u]. */
export function sparkAt(
	trail: BurnTrail,
	b: Burn,
	tau: number
): [number, number, number, number, number, number] {
	"worklet";
	const own = trail.runs[b.leg];
	if (!own) {
		return [0, 0, 0, -1, -1, 0];
	}
	let leg = b.leg;
	let u =
		own.u0 + (own.u1 - own.u0) * easeInOut2(seg(tau, BURN_AT, BURN_AT + b.d));
	const sigma = tau - BURN_AT - b.d;
	if (b.ride.length && sigma > 0) {
		let s =
			sigma < RIDE_EASE
				? (RIDE_SPEED * sigma * sigma) / (2 * RIDE_EASE)
				: RIDE_SPEED * (sigma - RIDE_EASE / 2);
		s = Math.min(s, b.rideLen);
		const rest = own.length * (1 - own.u1);
		if (s < rest) {
			u = own.u1 + s / own.length;
		} else {
			s -= rest;
			for (const j of b.ride) {
				const l = trail.runs[j];
				if (!l) {
					continue;
				}
				leg = j;
				u = Math.min(1, s / l.length);
				if (s < l.length) {
					break;
				}
				s -= l.length;
			}
		}
	}
	const [x, y, nx, ny] = legAt(trail.runs[leg] ?? own, u);
	return [x, y, nx, ny, leg, u];
}

/** 0 under a disc, 1 clear of it: the spark rides the road beneath the stops. */
function underDisc(trail: BurnTrail, x: number, y: number) {
	"worklet";
	let near = 1e9;
	for (const [cx, cy] of trail.stops) {
		near = Math.min(near, Math.hypot(x - cx, y - cy));
	}
	return seg(near, RADIUS - UNDER, RADIUS + UNDER);
}

/** The spark's brightness (0 off … 1): in at the light, out over 120 ms at the arrival. */
export function sparkLevel(trail: BurnTrail, b: Burn, tau: number) {
	"worklet";
	if (b.leg < 0 || tau < 0) {
		return 0;
	}
	const a = arrivalOf(b);
	const on = easeOut(seg(tau, 0, SPARK_IN)) * (1 - seg(tau, a, a + SPARK_FADE));
	if (on <= 0) {
		return 0;
	}
	const [x, y] = sparkAt(trail, b, tau);
	return on * underDisc(trail, x, y);
}

/** The match flare: 0 → 1 → 0 as sin(πu) over the first 400 ms. */
export function flareAt(b: Burn, tau: number) {
	"worklet";
	return b.leg < 0 || tau < 0 || tau > FLARE_S
		? 0
		: Math.sin(Math.PI * seg(tau, 0, FLARE_S));
}

/** The gold's end on leg j: the burn's head while it runs, else 1 when lit, 0 when not. */
export function goldEnd(
	trail: BurnTrail,
	burns: readonly Burn[],
	lit: number,
	j: number,
	t: number
) {
	"worklet";
	for (const b of burns) {
		if (b.leg !== j) {
			continue;
		}
		const u = burnU(trail, b, t - b.t0);
		if (u >= 0) {
			return u;
		}
	}
	return lit;
}

/** A leg is burning: its dashes still show ahead of the spark. */
export function legBurning(burns: readonly Burn[], j: number, t: number) {
	"worklet";
	for (const b of burns) {
		if (b.leg === j && t - b.t0 < BURN_AT + b.d) {
			return true;
		}
	}
	return false;
}
