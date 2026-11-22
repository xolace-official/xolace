import { type LegRun, legAt } from "./leg-samples";
import { type Pt, RADIUS } from "./trail-points";

export const BURN_AT = 0.25;
const BURN_SPEED = 230;
const BURN_MIN = 1.2;
const BURN_MAX = 1.7;
const RIDE_SPEED = 420;
const RIDE_EASE = 0.25;
const FLARE_S = 0.4;
const SPARK_IN = 0.15;
export const SPARK_FADE = 0.12;
export const SMOKE_FADE = 0.6;
export const BURST_LIFE = 0.9;
const UNDER = 6;

export const END = { catch: 2, fire: 1, stop: 0 } as const;

export type BurnTrail = {
	runs: readonly LegRun[];
	stops: readonly Pt[];
	flame: Pt;
};

export type Burn = {
	t0: number;
	leg: number;
	d: number;
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

export const planCatch = (t0: number): Burn => ({
	d: 0,
	end: END.catch,
	leg: -1,
	ride: [],
	rideD: 0,
	rideLen: 0,
	t0,
});

export const maxBurns = (stops: number) => stops + 1;

export function arrivalOf(b: Burn) {
	"worklet";
	return b.leg < 0 ? 0 : BURN_AT + b.d + b.rideD;
}

export const lifeOf = (b: Burn) =>
	arrivalOf(b) + Math.max(BURST_LIFE, SMOKE_FADE);

export function burnU(trail: BurnTrail, b: Burn, tau: number) {
	"worklet";
	const l = trail.runs[b.leg];
	if (!l || tau >= BURN_AT + b.d) {
		return -1;
	}
	return l.u0 + (l.u1 - l.u0) * easeInOut2(seg(tau, BURN_AT, BURN_AT + b.d));
}

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

function underDisc(trail: BurnTrail, x: number, y: number) {
	"worklet";
	let near = 1e9;
	for (const [cx, cy] of trail.stops) {
		near = Math.min(near, Math.hypot(x - cx, y - cy));
	}
	return seg(near, RADIUS - UNDER, RADIUS + UNDER);
}

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

export function flareAt(b: Burn, tau: number) {
	"worklet";
	return b.leg < 0 || tau < 0 || tau > FLARE_S
		? 0
		: Math.sin(Math.PI * seg(tau, 0, FLARE_S));
}

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

export function legBurning(burns: readonly Burn[], j: number, t: number) {
	"worklet";
	for (const b of burns) {
		if (b.leg === j && t - b.t0 < BURN_AT + b.d) {
			return true;
		}
	}
	return false;
}
