import { MOOD_WORDS } from "../copy";
import {
	clamp,
	ease,
	ease4,
	easeIO,
	fs,
	interp,
	mod,
	seg,
} from "../first-run-motion";

export const N = MOOD_WORDS.length;
export const DRIFT = 18;
const OMEGA = 3.2;
export const MAX_THROW = 6000;
export const DRAG_SMOOTH = 0.06;
const LEAN_K = 140;
const LEAN_C = 11.8;
const LEAN_PER = 0.0055;
const LEAN_MAX = 7;
const STRETCH_PER = 0.000_04;
const STRETCH_MAX = 0.06;
const PRESS_K = 420;
const PRESS_C = 26;
const MAX_DT = 0.05;

export const OPEN = {
	acct: 2650,
	cardFor: 900,
	cardStep: 90,
	cards: 120,
	cta: 2450,
	glow: 1200,
	line: [1650, 1850, 2100],
	lineFor: 600,
	word0: 700,
	wordFor: 700,
	wordStep: 110,
} as const;
const NAME_HOLD = 2600;
export const X = {
	amber: 160,
	catch: 420,
	collapse: [120, 400],
	open: [420, 980],
	swap: 1000,
	swapRm: 300,
} as const;
export const CTA_Y = 730;
export const SPARKS = Array.from({ length: 12 }, (_, i) => ({
	at: 400 + i * 38,
	dur: 1000 + (i % 4) * 180,
	dx: ((i * 53) % 90) - 45,
	ph: i * 1.7,
	rise: 140 + ((i * 71) % 130),
	sz: 3 + (i % 3),
}));

export type PEng = {
	now: number;
	t0: number;
	hold: number;
	tx: number;
	xHold: number;
	acct: boolean;
	rm: boolean;
	off: number;
	v: number;
	vd: number;
	lean: number;
	ld: number;
	str: number;
	sq: number;
	sqd: number;
	down: boolean;
	dragging: boolean;
	dragVel: number;
	startX: number;
	lastX: number;
	lastAt: number;
	ni: number;
	tn: number;
	nHold: number;
	fired: number;
};

export const FIRE = { catch: 1, swap: 2 } as const;

export function freshEng(
	cw: number,
	sw: number,
	rm: boolean,
	hold: number
): PEng {
	return {
		acct: false,
		down: false,
		dragging: false,
		dragVel: 0,
		fired: 0,
		hold,
		lastAt: 0,
		lastX: 0,
		ld: 0,
		lean: 0,
		nHold: -1,
		ni: -1,
		now: 0,
		off: -(sw - cw) / 2,
		rm,
		sq: 0,
		sqd: 0,
		startX: 0,
		str: 0,
		t0: 0,
		tn: -1,
		tx: -1,
		v: rm ? 0 : DRIFT,
		vd: 0,
		xHold: -1,
	};
}

export function ageT(e: PEng) {
	"worklet";
	return e.hold >= 0 ? e.hold : e.now - e.t0;
}
export function ageX(e: PEng) {
	"worklet";
	if (e.xHold >= 0) {
		return e.xHold;
	}
	return e.tx >= 0 ? e.now - e.tx : -1;
}
function ageN(e: PEng) {
	"worklet";
	if (e.nHold >= 0) {
		return e.nHold;
	}
	return e.tn >= 0 ? e.now - e.tn : -1;
}

const SETTLE_AFTER = OPEN.acct + 1000;
const AT_REST = 0.001;

export function promiseSettled(e: PEng) {
	"worklet";
	return (
		e.rm &&
		e.tx < 0 &&
		!e.dragging &&
		!e.down &&
		(e.tn < 0 || e.now - e.tn > NAME_HOLD + 200) &&
		ageT(e) > SETTLE_AFTER &&
		Math.abs(e.lean) < AT_REST &&
		Math.abs(e.ld) < AT_REST &&
		Math.abs(e.sq) < AT_REST &&
		Math.abs(e.sqd) < AT_REST
	);
}

export function step(e: PEng, dtMs: number) {
	"worklet";
	const dt = Math.min(MAX_DT, dtMs / 1000);
	const named = e.tn >= 0 && e.now - e.tn < NAME_HOLD + 200;
	if (e.hold >= 0 && e.tx < 0) {
		return;
	}
	if (!e.dragging && e.tx < 0) {
		if (e.rm) {
			e.v = 0;
		} else {
			const target = named ? 0 : DRIFT;
			const acc = OMEGA * OMEGA * (target - e.v) - 2 * OMEGA * e.vd;
			e.vd += acc * dt;
			e.v += e.vd * dt;
		}
		e.off += e.v * dt;
	} else if (e.tx >= 0) {
		e.v *= Math.exp(-6 * dt);
		e.off += e.v * dt;
	}
	const sp = e.dragging ? e.dragVel : e.v;
	const target = -clamp(sp * LEAN_PER, -LEAN_MAX, LEAN_MAX);
	e.ld += (LEAN_K * (target - e.lean) - LEAN_C * e.ld) * dt;
	e.lean += e.ld * dt;
	e.str = Math.min(Math.abs(sp) * STRETCH_PER, STRETCH_MAX);
	e.sqd += (PRESS_K * ((e.down ? 1 : 0) - e.sq) - PRESS_C * e.sqd) * dt;
	e.sq += e.sqd * dt;
}

export function cardLeft(e: PEng, i: number, cw: number) {
	"worklet";
	return mod(i * cw - e.off + cw, N * cw) - cw;
}

export type CardPose = {
	op: number;
	x: number;
	ty: number;
	rot: number;
	sc: number;
	skew: number;
	st: number;
	lift: number;
};

export function cardPose(e: PEng, i: number, cw: number, sw: number): CardPose {
	"worklet";
	const t = ageT(e);
	const x = ageX(e);
	const mid = (sw - cw) / 2;
	const left = cardLeft(e, i, cw);
	const rot = interp(left, [0, sw - cw], [-0.4, 0.4]);
	let ty = interp(left, [0, mid, sw - cw], [2, -1, 2]);
	let sc = interp(left, [0, mid, sw - cw], [0.95, 1, 0.95]);
	let op = clamp(
		interp(left, [-cw, 0, mid, sw - cw, sw], [0.3, 0.7, 1, 0.7, 0.3])
	);
	if (e.rm) {
		op *= clamp(t / 200);
	} else {
		const at = OPEN.cards + OPEN.cardStep * clamp((left + cw) / cw, 0, 4);
		const p = ease4(seg(t, at, at + OPEN.cardFor));
		op *= p;
		ty += 14 * (1 - p);
	}
	let lift = 0;
	const n = ageN(e);
	if (e.ni === i && n >= 0) {
		lift =
			(e.rm ? clamp(n / 200) : fs(n / 1000, 14, 0.55)) *
			(1 - ease(seg(n, NAME_HOLD, NAME_HOLD + 400)));
		ty -= 10 * lift;
		sc *= 1 + 0.045 * lift;
	}
	if (x >= 0) {
		if (e.rm) {
			op *= 1 - clamp(x / 200);
		} else {
			const d = 80 + 120 * clamp(Math.abs(left + cw / 2 - sw / 2) / 300);
			const q = ease(seg(x, d, d + 460));
			op *= 1 - q;
			ty += 28 * q;
			sc *= 1 - 0.04 * q;
		}
	}
	return {
		lift,
		op,
		rot,
		sc,
		skew: e.rm ? 0 : e.lean,
		st: e.rm ? 0 : e.str,
		ty,
		x: left,
	};
}

export function namePose(e: PEng, i: number) {
	"worklet";
	const n = ageN(e);
	if (e.ni !== i || n < 0) {
		return { dy: 6, gl: 0, line: 0, warm: 0 };
	}
	const gl = e.rm ? 0 : Math.exp(-(((n / 700 - 0.42) / 0.2) ** 2));
	const hold = 1 - ease(seg(n, NAME_HOLD, NAME_HOLD + 400));
	const lp = e.rm ? clamp(n / 200) : ease(seg(n, 160, 520));
	return {
		dy: 6 * (1 - lp),
		gl,
		line: lp * hold,
		warm: Math.max(gl, 0.6 * hold),
	};
}

export function leaveOf(e: PEng) {
	"worklet";
	const x = ageX(e);
	return x < 0 ? 0 : e.rm ? clamp(x / 200) : ease(seg(x, 60, 380));
}

export function darkOf(e: PEng) {
	"worklet";
	const x = ageX(e);
	return x < 0 ? 0 : e.rm ? clamp(x / 300) : ease(seg(x, 100, 600));
}

export function underglow(e: PEng) {
	"worklet";
	const t = ageT(e);
	const x = ageX(e);
	const on = e.rm ? 1 : ease(seg(t, OPEN.glow, OPEN.glow + 1200));
	const ph = mod(t - OPEN.glow, 5300);
	const br = e.rm
		? 0.5
		: ph < 2000
			? easeIO(ph / 2000)
			: 1 - easeIO((ph - 2000) / 3300);
	const grow = x >= 0 && !e.rm ? ease(seg(x, 0, 520)) : 0;
	const gone = x >= 0 ? (e.rm ? clamp(x / 300) : seg(x, 600, 900)) : 0;
	return {
		op: on * (0.72 + 0.28 * br) * (1 + 0.5 * grow) * (1 - gone),
		sc: 1 + 0.06 * br + 0.5 * grow,
		ty: -40 * grow,
	};
}
