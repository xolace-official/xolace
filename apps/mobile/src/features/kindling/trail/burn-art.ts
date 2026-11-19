import { Skia, type SkPath } from "@shopify/react-native-skia";
import {
	arrivalOf,
	BURN_AT,
	BURST_LIFE,
	type Burn,
	type BurnTrail,
	END,
	hash,
	SMOKE_FADE,
	SPARK_FADE,
	seg,
	sparkAt,
	sparkLevel,
} from "./burn";
import { LEG_SAMPLES, legAt } from "./leg-samples";
import type { Pt } from "./trail-points";

/*
 The tend's particles, rebuilt in a worklet each frame as a handful of batched paths (never one
 node per particle), as native-cook's `fuseBurnArt.ts` does: the ember behind the spark, thrown
 sparks and bursts, smoke, and the embers that rise from the fire once it has caught.
 */

type Builder = ReturnType<typeof Skia.PathBuilder.Make>;

/** Thrown sparks per burn, and the bursts' counts (§4 Phase C, §5). */
const SPARKS = 64;
const BURST_STOP = 18;
const BURST_FIRE = 30;
const GRAVITY = 300;
const SPREAD = 1.1;
/** A thrown spark lives 0.3–0.55 s. */
const MIN_LIFE = 0.3;
const MAX_LIFE = 0.55;
/** The ember: the last ~30 pt behind the spark. */
const EMBER_PT = 30;
const PUFFS = 9;
const FIRE_EMBERS = 8;
const EMBER_RISE = 120;
/** One fire ember rises over this long, three times over after a catch. */
const EMBER_LIFE = 2.8;
const EMBER_CYCLES = 3;
/** Seconds from the catch until the last ember has risen: the clock can rest after. */
export const EMBERS_S = (EMBER_CYCLES + 1) * EMBER_LIFE;

/** Small per-sample crinkle, so the cooling ember looks curled, not drawn (fuse `crinkle`). */
function crinkle(i: number) {
	"worklet";
	return Math.sin(i * 0.9) * 0.9 + Math.sin(i * 2.3 + 1) * 0.5;
}

function addEmber(e: Builder, trail: BurnTrail, b: Burn, tau: number) {
	"worklet";
	const l = trail.runs[b.leg];
	if (!l || tau < BURN_AT || tau > BURN_AT + b.d) {
		return;
	}
	const u = sparkAt(trail, b, tau)[5];
	const i1 = Math.round(u * (LEG_SAMPLES - 1));
	const i0 = Math.max(
		0,
		i1 - Math.round((EMBER_PT / l.length) * (LEG_SAMPLES - 1))
	);
	for (let i = i0; i <= i1; i += 1) {
		const o = crinkle(i);
		const x = (l.xs[i] ?? 0) + (l.nx[i] ?? 0) * o;
		const y = (l.ys[i] ?? 0) + (l.ny[i] ?? 0) * o;
		if (i === i0) {
			e.moveTo(x, y);
		} else {
			e.lineTo(x, y);
		}
	}
}

function addThrown(
	hot: Builder,
	warm: Builder,
	trail: BurnTrail,
	b: Burn,
	tau: number
) {
	"worklet";
	for (let i = 0; i < SPARKS; i += 1) {
		const life = MIN_LIFE + hash(i + 0.7) * (MAX_LIFE - MIN_LIFE);
		const phase = (tau / life + hash(i + 2.1)) % 1;
		const age = phase * life;
		const te = tau - age;
		if (te < 0 || hash(i + 5.5) > sparkLevel(trail, b, te)) {
			continue;
		}
		// Thrown from where the spark was at te, along its normal ± 1.1 rad, a little back along the leg.
		const [ex, ey, nx, ny, leg, u] = sparkAt(trail, b, te);
		const l = trail.runs[leg];
		if (!l) {
			continue;
		}
		const [ax, ay] = legAt(l, u + 0.01);
		const tl = Math.hypot(ax - ex, ay - ey) || 1;
		const tx = (ax - ex) / tl;
		const ty = (ay - ey) / tl;
		const spread = (hash(i + 3.3) - 0.5) * 2 * SPREAD;
		const speed = 50 + hash(i + 8.8) * 110;
		const vx =
			(nx * Math.cos(spread) - ny * Math.sin(spread) - tx * 0.35) * speed;
		const vy =
			(ny * Math.cos(spread) + nx * Math.sin(spread) - ty * 0.35 - 0.45) *
			speed;
		const x = ex + vx * age;
		const y = ey + vy * age + 0.5 * GRAVITY * age * age;
		const len = 0.018 + (1 - phase) * 0.02;
		const target = phase < 0.45 ? hot : warm;
		target.moveTo(x, y);
		target.lineTo(x - vx * len, y - (vy + GRAVITY * age) * len);
	}
}

/** Fuse's burst: radial sparks that slow, drop and thin; kept round. */
function addBurst(
	hot: Builder,
	warm: Builder,
	[cx, cy]: Pt,
	n: number,
	a: number
) {
	"worklet";
	if (a < 0 || a >= BURST_LIFE) {
		return;
	}
	for (let i = 0; i < n; i += 1) {
		if (a > 0.75 && hash(i + 42) > (0.9 - a) * 6) {
			continue;
		}
		const ang = (i / n) * Math.PI * 2 + hash(i + 40) * 0.2;
		const speed = 170 + hash(i + 41) * 170;
		const travel = (speed * (1 - Math.exp(-3.2 * a))) / 3.2 + 20;
		const x = cx + Math.cos(ang) * travel;
		const y = cy + Math.sin(ang) * travel + 60 * a * a;
		const tail = 10 * Math.exp(-2.5 * a);
		const target = a < 0.35 ? hot : warm;
		target.moveTo(x, y);
		target.lineTo(x - Math.cos(ang) * tail, y - Math.sin(ang) * tail);
	}
}

function addSmoke(s: Builder, trail: BurnTrail, b: Burn, tau: number) {
	"worklet";
	const l = trail.runs[b.leg];
	const done = BURN_AT + b.d;
	if (!l || tau < BURN_AT || tau > done + SMOKE_FADE) {
		return;
	}
	const progress = seg(tau, BURN_AT, done);
	const amount =
		Math.min(1, progress * 8) * (1 - seg(tau, done, done + SMOKE_FADE));
	const head = l.u0 + (l.u1 - l.u0) * Math.min(1, progress);
	for (let j = 0; j < PUFFS; j += 1) {
		const life = 1.8 + hash(j + 60) * 1.2;
		const phase = (tau / life + hash(j + 61)) % 1;
		// Born along the burnt part, nearer the spark.
		const u =
			l.u0 + (head - l.u0) * (1 - hash(j + 62) * 0.5 * (1 - phase * 0.3));
		const [x, y] = legAt(l, u);
		const drift = Math.sin(phase * 5 + j) * 10 * phase;
		const r = (6 + phase * 12) * Math.sin(Math.PI * phase) * amount;
		if (r > 0.5) {
			s.addCircle(x + drift, y - phase * 70, r);
		}
	}
}

/** Embers rise from the flame once it has caught: 8 at a time, 120 pt over 2.8 s, three each. */
function addFireEmbers(e: Builder, [fx, fy]: Pt, since: number) {
	"worklet";
	for (let k = 0; k < FIRE_EMBERS; k += 1) {
		const start = (k / FIRE_EMBERS) * EMBER_LIFE;
		if (since < start) {
			continue;
		}
		const age = (since - start) / EMBER_LIFE;
		if (age >= EMBER_CYCLES) {
			continue;
		}
		const phase = age % 1;
		const dx = (hash(k + 80) - 0.5) * 50 * phase + Math.sin(phase * 7 + k) * 4;
		const rise = EMBER_RISE * (1 - (1 - phase) * (1 - phase));
		const r = 2 * Math.min(1, phase / 0.12) * (1 - phase * 0.7);
		if (r > 0.2) {
			e.addCircle(fx + dx, fy - 12 - rise, r);
		}
	}
}

export type FxPaths = {
	hot: SkPath;
	warm: SkPath;
	ember: SkPath;
	smoke: SkPath;
	embers: SkPath;
	emberLevel: number;
};

/** Everything the tend draws at trail clock `t`; `embersSince` < 0 while no embers rise. */
export function fxPaths(
	trail: BurnTrail,
	burns: readonly Burn[],
	t: number,
	embersSince: number
): FxPaths {
	"worklet";
	const hot = Skia.PathBuilder.Make();
	const warm = Skia.PathBuilder.Make();
	const ember = Skia.PathBuilder.Make();
	const smoke = Skia.PathBuilder.Make();
	const embers = Skia.PathBuilder.Make();
	let emberLevel = 0;
	for (const b of burns) {
		const tau = t - b.t0;
		if (tau < 0) {
			continue;
		}
		const a = tau - arrivalOf(b);
		// Sparks already thrown keep flying after the spark itself has gone.
		if (b.leg >= 0 && a < SPARK_FADE + MAX_LIFE) {
			addThrown(hot, warm, trail, b, tau);
		}
		addEmber(ember, trail, b, tau);
		emberLevel = Math.max(
			emberLevel,
			Math.min(1, sparkLevel(trail, b, tau) * 1.2)
		);
		addSmoke(smoke, trail, b, tau);
		if (b.end === END.catch) {
			addBurst(hot, warm, trail.flame, BURST_FIRE, a);
		} else if (b.end === END.stop) {
			const next = trail.stops[b.leg + 1];
			if (next) {
				addBurst(hot, warm, next, BURST_STOP, a);
			}
		}
	}
	if (embersSince >= 0) {
		addFireEmbers(embers, trail.flame, embersSince);
	}
	return {
		ember: ember.build(),
		emberLevel,
		embers: embers.build(),
		hot: hot.build(),
		smoke: smoke.build(),
		warm: warm.build(),
	};
}
