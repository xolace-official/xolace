/**
 * The arrival's motion (arrivals §2, §3): the board's `scene()`
 * (`ArrivalsAlive.dc.html`), ported function by function as worklets. Every
 * value on screen is a pure function of ages in ms read from one engine that
 * one frame callback steps. Positions are the board's 390 × 844 phone,
 * re-centred on the screen's width and shifted by the status bar (`Geo`).
 */
import { CONFETTI, RING_SPARK } from "@/features/achievements/badge-palette";
import {
	clamp,
	easeIO,
	easeOut,
	fs,
	hash,
	lerp,
	seg,
	TAU,
} from "@/features/achievements/motion-math";

/** The board's phone. */
const BOARD = { h: 844, status: 54, w: 390 } as const;
/** The badge's centre and radius, on the board (236 pt). */
export const HELD = { r: 118, y: 318 } as const;
export const COIN = HELD.r * 2;
/** The fire and the count's centre, on the board. */
const FIRE = { dx: -6, y: 362 } as const;
const COUNT_Y = 452;
export const LIFT = -48;
/** The badge lands (and the burst starts) this long after it starts to drop. */
export const LAND = 520;
/** Before this, a tap anywhere on the milestone jumps to its settled state. */
export const MS_DONE = 4200;
/** The milestone, in ms from the screen opening. */
export const T = {
	cta: 3500,
	day0: 2500,
	dayStep: 110,
	freeze: 3150,
	label: 1150,
	lift: 1900,
	liftFor: 500,
	line: 1450,
	roll: 1000,
	rollFor: 360,
	today: 220,
	token: 3450,
	week: 2100,
} as const;
/** The badge, in ms from it starting to drop. */
export const RV = {
	copy: 680,
	cta: 860,
	eye: 300,
	hint: 2400,
	sparks: 760,
	title: 600,
} as const;
/** Next between badges; the close; the milestone stepping aside; the badge after it. */
export const X_MS = 440;
const CLOSE_MS = 260;
export const CLOSE_GO_MS = 300;
const OUT_MS = 360;
export const BADGE_AFTER_MS = 200;
const HOP_MS = 360;
const HOP = 16;
/** The clock stops: after the last ember, after the fall, after the burst. */
const MS_STOP = 8400;
const FALL_STOP = 7100;
const BURST_LAST = 26 * 12 + 3500;
const PUFF_MS = 1500;
const REDUCED_MS = 300;
/** Production's fx loops repeat on these; the loop that takes over when the clock stops is a multiple of all three. */
const GLOW_MS = 2800;
export const SPARKLE_MS = 2400;
export const SHIMMER_EVERY = 6000;
export const FX_LOOP_MS = 84_000;
/** Drag to turn: a badge-width is a half turn; friction and the settle as on the badge page. */
export const FRICTION = 3.8;
export const SETTLE_SPEED = 2.2;
export const SNAP_MS = 300;
/** The drop: y on `fs(7.4, .74)`, scale .6 → 1 on production's spring (damping 11, stiffness 140). */
const DROP = { from: -150, w: 7.4, z: 0.74 } as const;
const GROW = { from: 0.6, w: 11.83, z: 0.465 } as const;
const TURN = { w: 5.2, z: 0.68 } as const;
const TILT = { amp: 0.25, ms: 600 } as const;
const SWAY = { amp: 0.08, from: 900, in: 500, period: 5500 } as const;
const CLOSE_SHRINK = 0.08;
const BAND_MS = 520;
const BLOOM_IN = 400;
const BREATH = { rest: 0.85, swing: 0.15 } as const;
const REVEAL_MS = 380;
const REDUCED_FADE_MS = 200;

export type Geo = {
	W: number;
	H: number;
	/** Status-bar shift from the board. */
	dy: number;
	cx: number;
	hy: number;
	fx: number;
	fy: number;
	cy: number;
};

export function geoFor(W: number, H: number, top: number): Geo {
	const dy = top - BOARD.status;
	return {
		cx: W / 2,
		cy: COUNT_Y + dy,
		dy,
		fx: W / 2 + FIRE.dx,
		fy: FIRE.y + dy,
		H,
		hy: HELD.y + dy,
		W,
	};
}

/** One piece of confetti: the burst thrown from the badge, or the slow fall from the top. */
export type Piece = {
	burst: boolean;
	i: number;
	ang: number;
	rad: number;
	/** The fall's x, as a share of the width. */
	x0: number;
	dur: number;
	delay: number;
	sway: number;
	round: boolean;
	w: number;
	h: number;
	col: string;
	spin: number;
	flut: number;
	/** Drawn in front of the badge (some burst pieces pass over it). */
	front: boolean;
};
const NB = 26;
const NR = 34;
const BURST_SPREAD = 0.4;
const BURST_REACH = { base: 110, more: 120 } as const;
const ROUND_ABOVE = { burst: 0.62, fall: 0.6 } as const;
const DOT = 8;
const RECT = { h: 11, hMore: 4, w: 6, wMore: 3 } as const;
const FRONT_BELOW = -0.25;

const shape = (round: boolean, i: number, kw: number, kh: number) => ({
	h: round ? DOT : RECT.h + RECT.hMore * hash(i, kh),
	round,
	w: round ? DOT : RECT.w + RECT.wMore * hash(i, kw),
});

/** The board's `PIECES`: seeded, the same confetti every time. */
export const PIECES: readonly Piece[] = [
	...Array.from({ length: NB }, (_, i): Piece => {
		const ang = (i / NB) * TAU + (hash(i, 1) - 0.5) * BURST_SPREAD;
		return {
			...shape(hash(i, 7) > ROUND_ABOVE.burst, i, 8, 9),
			ang,
			burst: true,
			col: CONFETTI[i % CONFETTI.length],
			delay: 0,
			dur: 0,
			flut: 4 + 4 * hash(i, 6),
			front: i % 2 === 0 && Math.sin(ang) < FRONT_BELOW,
			i,
			rad: BURST_REACH.base + BURST_REACH.more * hash(i, 2),
			spin: (hash(i, 4) > 0.5 ? 1 : -1) * (160 + 260 * hash(i, 5)),
			sway: 0,
			x0: 0,
		};
	}),
	...Array.from(
		{ length: NR },
		(_, i): Piece => ({
			...shape(hash(i, 17) > ROUND_ABOVE.fall, i, 18, 19),
			ang: 0,
			burst: false,
			col: CONFETTI[(i + 2) % CONFETTI.length],
			delay: hash(i, 13) * 1800,
			dur: 3000 + hash(i, 12) * 1400,
			flut: 3 + 4 * hash(i, 20),
			front: false,
			i,
			rad: 0,
			spin: (hash(i, 15) > 0.5 ? 1 : -1) * (180 + 360 * hash(i, 16)),
			sway: 14 + hash(i, 14) * 22,
			// The board's x from 8 to 382 on 390, as a share of the width.
			x0: (8 + hash(i, 11) * 374) / BOARD.w,
		})
	),
];

/** Production's five rim sparkles (`badge-fx.tsx` `SPARKLES`): where (turns), how big, their phase. */
export const SPARKLES = [
	{ ph: 0, r: 0.07, turn: 0.1 },
	{ ph: 0.35, r: 0.05, turn: 0.32 },
	{ ph: 0.7, r: 0.06, turn: 0.58 },
	{ ph: 0.2, r: 0.045, turn: 0.8 },
	{ ph: 0.55, r: 0.055, turn: 0.93 },
] as const;

const RING_N = 14;
/** The ring of sparks leaving the count (streak-flame-takeover). */
export const RING = Array.from({ length: RING_N }, (_, i) => {
	const a = (i / RING_N) * TAU + 0.3;
	const reach = 80 + ((i * 37) % 50);
	return {
		col: i % 3 === 1 ? RING_SPARK.orange : RING_SPARK.gold,
		dx: Math.cos(a) * reach,
		dy: Math.sin(a) * reach * 0.8,
		s: 5 + (i % 3) * 3,
	};
});
/** Embers rising from the fire, and the puff when Flux is tapped. */
export const NE = 10;
export const NP = 8;

/** Phases and events the clock reports to React. */
export const PH = { badge: 1, ms: 0 } as const;
export const EV = {
	close: 6,
	faced: 5,
	idle: 7,
	land: 4,
	roll: 1,
	today: 2,
	token: 3,
} as const;
export const MODE = { free: 1, none: 0, snap: 2 } as const;

/**
 * The one engine: ages are `now − t*`, −1 while a stamp is unset. `now` is the
 * clock's own time, summed from frame deltas, so it pauses while the clock sleeps.
 */
export type Eng = {
	now: number;
	phase: number;
	step: number;
	/** Stamps: milestone, Next out of it, badge drop, burst (and hop), Next between badges, ember puff, close. */
	tm: number;
	to: number;
	ta: number;
	tu: number;
	tx: number;
	tp: number;
	tc: number;
	/** The slow fall: the first badge only. */
	rain: boolean;
	spin: number;
	v: number;
	mode: number;
	from: number;
	goal: number;
	at: number;
	drag: boolean;
	dragFrom: number;
	turned: boolean;
	rm: boolean;
	/** The ages at the previous frame, so each event fires once as its time is crossed. */
	lm: number;
	la: number;
};

/**
 * Where the clock starts. Stamps are clock times and −1 means unset, so the
 * clock starts well above zero: a skip that moves a stamp back (`now − 4200`)
 * can never make it look unset.
 */
export const CLOCK_START = 100_000;

export function freshEng(hasMs: boolean, rm: boolean): Eng {
	return {
		at: 0,
		drag: false,
		dragFrom: 0,
		from: 0,
		goal: 0,
		la: -1,
		lm: -1,
		mode: MODE.none,
		now: CLOCK_START,
		phase: hasMs ? PH.ms : PH.badge,
		rain: true,
		rm,
		spin: 0,
		step: 0,
		ta: hasMs ? -1 : CLOCK_START,
		tc: -1,
		tm: hasMs ? CLOCK_START : -1,
		to: -1,
		tp: -1,
		tu: -1,
		turned: false,
		tx: -1,
		v: 0,
	};
}

export function age(e: Eng, t: number) {
	"worklet";
	return t < 0 ? -1 : e.now - t;
}

/** Is anything still moving? When not, the clock stops (§6). */
export function busy(e: Eng) {
	"worklet";
	if (e.tc >= 0 || e.drag || e.mode !== MODE.none) {
		return true;
	}
	if (e.phase === PH.ms) {
		const m = age(e, e.tm);
		if (e.rm) {
			return m < REDUCED_MS;
		}
		return m < MS_STOP || (e.tp >= 0 && e.now - e.tp < PUFF_MS);
	}
	const a = age(e, e.ta);
	if (a < 0) {
		return true;
	}
	if (e.to >= 0 && e.now - e.to < OUT_MS + 60) {
		return true;
	}
	if (e.rm) {
		return a < REDUCED_MS;
	}
	if (e.tx >= 0 && e.now - e.tx < X_MS) {
		return true;
	}
	if (e.tu >= 0 && e.now - e.tu < BURST_LAST) {
		return true;
	}
	return a < (e.rain ? FALL_STOP : RV.hint + 500);
}

/** The badge in flight: its centre y, radius, opacity, turn and tilt, and how far it has closed. */
export function coinAt(e: Eng, g: Geo) {
	"worklet";
	const a = age(e, e.ta);
	const rm = e.rm;
	const yp = rm ? 1 : fs(a / 1000, DROP.w, DROP.z);
	let cy = lerp(DROP.from + g.dy, g.hy, yp);
	let scale = rm
		? 1
		: GROW.from + (1 - GROW.from) * fs(a / 1000, GROW.w, GROW.z);
	const op = rm ? clamp(a / REDUCED_FADE_MS) : a < 0 ? 0 : 1;
	const spin = (rm ? 0 : TAU * fs(a / 1000, TURN.w, TURN.z)) + e.spin;
	let tiltX = 0;
	let tiltY = 0;
	if (!rm) {
		tiltX = TILT.amp * Math.sin(Math.PI * clamp(a / TILT.ms));
		if (a > SWAY.from && !e.drag) {
			const sw = Math.min(1, (a - SWAY.from) / SWAY.in);
			const ph = ((a - SWAY.from) / SWAY.period) * TAU;
			tiltX += SWAY.amp * Math.sin(ph) * sw;
			tiltY += SWAY.amp * Math.cos(ph) * sw;
		}
		const u = age(e, e.tu);
		if (u >= 0 && u < HOP_MS) {
			cy -= HOP * Math.sin(Math.PI * (u / HOP_MS));
		}
	}
	const close = e.tc >= 0 ? easeOut(age(e, e.tc) / CLOSE_MS) : 0;
	scale *= 1 - CLOSE_SHRINK * close;
	return { a, close, cy, op, r: HELD.r * scale, spin, tiltX, tiltY };
}

/** The shimmer's band (0–1 while it crosses, −1 otherwise): once as it lands, then every 6 s. */
export function bandAt(fa: number, rm: boolean) {
	"worklet";
	if (rm || fa < LAND) {
		return -1;
	}
	const b = ((fa - LAND) % SHIMMER_EVERY) / BAND_MS;
	return b <= 1 ? b : -1;
}

/** The glow: up from landing, breathing on production's 2.8 s. */
export function bloomAt(a: number, fa: number, rm: boolean) {
	"worklet";
	if (rm) {
		return 1;
	}
	return (
		easeOut(seg(a, LAND, LAND + BLOOM_IN)) *
		(BREATH.rest + BREATH.swing * Math.sin((fa / GLOW_MS) * TAU))
	);
}

/**
 * The milestone's lift (−48 pt over 1.9–2.4 s): it makes room for the week and
 * freeze cards, so with neither drawn (`lifts` false) nothing moves.
 */
export function liftAt(m: number, rm: boolean, lifts = true) {
	"worklet";
	if (!lifts) {
		return 0;
	}
	return rm ? LIFT : LIFT * easeIO(seg(m, T.lift, T.lift + T.liftFor));
}

/** How far the milestone has stepped aside after Next (0 → 1 over 360 ms). */
export function outAt(e: Eng) {
	"worklet";
	if (e.phase === PH.ms) {
		return 0;
	}
	return easeOut(age(e, e.to) / OUT_MS);
}

/** A reveal: fades over 380 ms (or a 200 ms fade under Reduce Motion). */
export function revealAt(a: number, at: number, rm: boolean) {
	"worklet";
	return rm ? clamp(a / REDUCED_FADE_MS) : easeOut(seg(a, at, at + REVEAL_MS));
}

/** What closing leaves of anything that fades with it: 1 until the close, then down over 260 ms. */
export function shutAt(e: Eng) {
	"worklet";
	return e.tc >= 0 ? 1 - easeOut(age(e, e.tc) / CLOSE_MS) : 1;
}
