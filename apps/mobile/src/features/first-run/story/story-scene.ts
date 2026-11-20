import { BEATS } from "../copy";
import { clamp, ease, easeIO, seg } from "../first-run-motion";

export const NB = BEATS.length;
export const W = {
	at: 250,
	dur: 250,
	light: 150,
	lightDur: 250,
	lightStep: 300,
	step: 60,
} as const;
const wordsEnd = (n: number) => W.at + W.step * (n - 1) + W.dur;
export const WE = BEATS.map((b) => wordsEnd(b.words.length));
export const DUR = BEATS.map((b) => b.ms);

export const FIRE0 = { x: 195, y: 704 };
export const VENT_O = { x: 136, y: 475 };
export const SEAT_PT = { x: 290, y: 452 };
export const XS = { h: 254, w: 214, x: 140, y: 384 };
export const SKY = { h: 280, w: 342, x: 24, y: 372 };
export const FLD = { h: 300, w: 342, x: 24, y: 236 };
export const LEFT_TAP = 130;
export const SWIPE = 50;

export const EV = {
	beat: 1,
	closed: 16,
	flick: 32,
	intake: 8,
	rumble: 64,
	seat: 2,
	seated: 4,
	tick: 128,
} as const;
const F = { auto: 2, intake: 16, rip: 1, seated: 8, zoom: 4 } as const;
export const KIND = { card: 2, none: 0, tap: 1, vent: 4, zoom: 3 } as const;
export const PROV = { apple: 1, google: 2, none: 0 } as const;
export const AUTH = { back: 1100, done: 4000, seated: 1800 } as const;

export type SEng = {
	now: number;
	t0: number;
	hold: number;
	rm: boolean;
	sr: boolean;
	beat: number;
	prev: number;
	tb: number;
	bar: number;
	seatAt: number;
	seatOff: number;
	authProv: number;
	authAt: number;
	okAt: number;
	aHold: number;
	puff: number;
	ripX: number;
	ripY: number;
	ripAt: number;
	mwi: number;
	vent: number;
	holding: boolean;
	hint: number;
	goneAt: number;
	flareI: number;
	flareAt: number;
	xk: number;
	xdx: number;
	xdx0: number;
	xMoved: boolean;
	flyFrom: number;
	flyDir: number;
	flyAt: number;
	zoom: number;
	zUser: boolean;
	fired: number;
	ev: number;
	kind: number;
	sx: number;
	sy: number;
	lx: number;
	ly: number;
	lt: number;
	t0d: number;
	z0: number;
	moved: boolean;
	vx: number;
};

export function freshStory(
	rm: boolean,
	beat: number,
	hold: number,
	seat: boolean
): SEng {
	return {
		aHold: -1,
		authAt: -1,
		authProv: 0,
		bar: 0,
		beat,
		ev: 0,
		fired: 0,
		flareAt: -1,
		flareI: -1,
		flyAt: -1,
		flyDir: -1,
		flyFrom: -1,
		goneAt: -1,
		hint: 0,
		hold,
		holding: false,
		kind: 0,
		lt: 0,
		lx: 0,
		ly: 0,
		moved: false,
		mwi: 0,
		now: 0,
		okAt: -1,
		prev: -1,
		puff: -1,
		ripAt: -1,
		ripX: 0,
		ripY: 0,
		rm,
		seatAt: seat ? 0 : -1,
		seatOff: -1,
		sr: false,
		sx: 0,
		sy: 0,
		t0: 0,
		t0d: 0,
		tb: 0,
		vent: 0,
		vx: 0,
		xdx: 0,
		xdx0: 0,
		xk: 0,
		xMoved: false,
		z0: 0,
		zoom: 0,
		zUser: false,
	};
}

export function ageT(e: SEng) {
	"worklet";
	return e.hold >= 0 ? e.hold : e.now - e.t0;
}
export function ageB(e: SEng) {
	"worklet";
	return e.hold >= 0 && e.seatAt < 0 ? e.hold : e.now - e.tb;
}
export function ageOf(e: SEng, at: number) {
	"worklet";
	return at >= 0 ? e.now - at : -1;
}
export function ageAuth(e: SEng) {
	"worklet";
	if (e.aHold >= 0) {
		return e.aHold;
	}
	if (e.authAt < 0) {
		return -1;
	}
	if (e.okAt < 0) {
		return Math.min(e.now - e.authAt, AUTH.back - 1);
	}
	return AUTH.back + (e.now - e.okAt);
}

export function ageSpin(e: SEng) {
	"worklet";
	if (e.aHold >= 0) {
		return e.aHold;
	}
	return ageOf(e, e.authAt);
}

export function beginAuth(e: SEng, prov: number) {
	"worklet";
	if (e.seatAt < 0 || e.authAt >= 0) {
		return;
	}
	e.authProv = prov;
	e.authAt = e.now;
	e.okAt = -1;
}

export function authOk(e: SEng) {
	"worklet";
	if (e.authAt < 0 || e.okAt >= 0) {
		return;
	}
	e.okAt = e.now;
}

export function authReset(e: SEng) {
	"worklet";
	e.authProv = 0;
	e.authAt = -1;
	e.okAt = -1;
	e.fired &= ~(F.seated | F.intake);
}
export function ageSeat(e: SEng) {
	"worklet";
	if (e.seatAt < 0) {
		return -1;
	}
	return e.hold >= 0 ? e.hold : e.now - e.seatAt;
}

export function seatOpen(e: SEng) {
	"worklet";
	let so = 0;
	const s = ageSeat(e);
	if (s >= 0) {
		so = e.rm ? clamp(s / 250) : ease(seg(s, 0, 600));
	}
	const off = ageOf(e, e.seatOff);
	if (e.seatAt < 0 && off >= 0) {
		so = e.rm ? 1 - clamp(off / 250) : 1 - ease(seg(off, 0, 450));
	}
	return clamp(so);
}

export function openSeat(e: SEng) {
	"worklet";
	if (e.seatAt >= 0) {
		return;
	}
	e.seatAt = e.now;
	e.seatOff = -1;
	e.authProv = 0;
	e.authAt = -1;
	e.okAt = -1;
	e.ev |= EV.seat;
}

export function closeSeat(e: SEng) {
	"worklet";
	if (e.seatAt < 0 || e.authAt >= 0) {
		return;
	}
	e.seatAt = -1;
	e.seatOff = e.now;
	e.hold = -1;
	e.bar = Math.min(e.bar, DUR[e.beat] * 0.6);
	e.ev |= EV.closed;
}

export function goBeat(e: SEng, n: number) {
	"worklet";
	if (e.seatAt >= 0) {
		return;
	}
	if (n >= NB) {
		openSeat(e);
		return;
	}
	if (n < 0 && e.beat === 0) {
		e.bar = 0;
		return;
	}
	e.prev = e.beat;
	e.beat = Math.max(0, n);
	e.tb = e.now;
	e.bar = 0;
	e.puff = -1;
	e.ripAt = -1;
	e.vent = 0;
	e.holding = false;
	e.hint = 0;
	e.flareI = -1;
	e.xk = 0;
	e.xdx = 0;
	e.xMoved = false;
	e.flyAt = -1;
	e.zoom = 0;
	e.zUser = false;
	e.fired = 0;
	e.ev |= EV.beat;
}

const SEAT_SETTLED = 1500;

export function storySettled(e: SEng) {
	"worklet";
	return (
		e.rm &&
		e.seatAt >= 0 &&
		e.authAt < 0 &&
		e.okAt < 0 &&
		e.vent === 0 &&
		ageSeat(e) > SEAT_SETTLED
	);
}

export function stepStory(e: SEng, dtMs: number) {
	"worklet";
	const dt = Math.min(50, dtMs);
	const running =
		e.hold < 0 && !e.sr && e.seatAt < 0 && !e.holding && e.kind === KIND.none;
	if (running) {
		e.bar += dt;
	}
	if (e.bar >= DUR[e.beat] && e.seatAt < 0) {
		goBeat(e, e.beat + 1);
	}
	const b = ageB(e);
	e.vent = clamp(e.vent + ((e.holding ? 1.6 : -0.9) * dt) / 1000);
	if (e.hint === 2 && e.now - e.goneAt > 2400) {
		e.hint = 0;
	}
	if (!e.rm && e.seatAt < 0 && e.hold < 0) {
		if (e.beat === 1 && b >= 2900 && !(e.fired & F.rip)) {
			e.fired |= F.rip;
			e.ripX = 258;
			e.ripY = 640;
			e.ripAt = e.now;
			e.mwi = (e.mwi + 1) % 4;
		}
		if (e.beat === 4 && b >= 3600 && !e.xMoved && !(e.fired & F.auto)) {
			e.fired |= F.auto;
			e.flyFrom = e.xk;
			e.flyDir = -1;
			e.flyAt = e.now;
			e.xdx0 = 0;
			e.xk = (e.xk + 1) % 3;
		}
	}
	if (!e.rm && e.seatAt < 0 && e.beat === 5 && !e.zUser) {
		e.zoom = easeIO(seg(b, WE[5] + 1400, WE[5] + 3000));
		if (e.zoom >= 1 && !(e.fired & F.zoom) && e.hold < 0) {
			e.fired |= F.zoom;
			e.ev |= EV.tick;
		}
	}
	if (e.okAt >= 0 && e.aHold < 0) {
		const aa = ageAuth(e);
		if (aa >= AUTH.seated && !(e.fired & F.seated)) {
			e.fired |= F.seated;
			e.ev |= EV.seated;
		}
		if (aa >= AUTH.done && !(e.fired & F.intake)) {
			e.fired |= F.intake;
			e.ev |= EV.intake;
		}
	}
}

export function v2in(e: SEng, b: number, at: number, dur: number, dy = 8) {
	"worklet";
	if (e.rm) {
		return { opacity: clamp(b / 200), transform: [{ translateY: 0 }] };
	}
	const t = ease(seg(b, at, at + dur));
	return { opacity: t, transform: [{ translateY: dy * (1 - t) }] };
}

export function beatPose(e: SEng, i: number, so: number) {
	"worklet";
	const b = ageB(e);
	if (i === e.beat) {
		return { dy: -24 * so, op: 1 - so };
	}
	if (i === e.prev && b < 300 && !e.rm) {
		const q = ease(b / 300);
		return { dy: -20 * q, op: 1 - q };
	}
	return { dy: 0, op: 0 };
}

export function bIf(e: SEng, i: number) {
	"worklet";
	return i === e.beat ? ageB(e) : 99_999;
}
