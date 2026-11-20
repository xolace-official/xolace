import type { NamePt, Pose, Pt } from "@/features/achievements/coin/pose";
import { REST_POSE, RV } from "@/features/achievements/coin/pose";
import {
	clamp,
	easeIO,
	easeOut,
	fs,
	lerp,
	showsBack,
	TAU,
} from "@/features/achievements/motion-math";

export const LAND_MS = 620;
const LAUNCH_END_MS = 1500;
const SWAY_FROM_MS = 900;
const SWAY_IN_MS = 500;
const SWAY_PERIOD_MS = 5500;
const SWAY = 0.09;
const FLIGHT_TILT = 0.25;
const FLIGHT_TILT_MS = 600;
const FLY_X = [9.5, 0.86] as const;
const FLY_Y = [6.8, 0.8] as const;
const FLY_R = [6.2, 0.64] as const;
const TURN = [5.2, 0.68] as const;
const CLOSE = [8.7, 0.87] as const;
const SPRING_BACK = [14, 0.8] as const;
const FRICTION = 3.8;
const SETTLE_SPEED = 2.2;
const SNAP_MS = 260;
const SLOW_MS = 700;
const BACK_MS = 600;
const RATTLE_MS = 420;
const RATTLE = { amp: 0.12, decay: 110, period: 24 } as const;
export const CLOSE_MS = 560;
export const FADE_MS = 200;
export const IDLE_MS = 10_000;
const REVEAL_AT = [520, 640, 700, 900, 960, 520] as const;
const REVEAL_FADE_MS = 240;
const REVEAL_RISE_MS = 420;
const REVEAL_RISE = 12;
const RECEDE_MS = 500;
const SPREAD = { from: 60, over: 700 } as const;
const BLOOM_MS = 400;
const BAND_MS = 500;
const DIM = { earned: 0.62, locked: 0.94 } as const;
const PULL = { colour: 260, name: 200, over: 300, shrink: 0.3, words: 150 };
const NAME_FADE = 0.45;
const POWER_FADE = 0.7;
const NAME_FOLLOW = 0.3;
const CLOSE_TILT = 0.3;
const CLOSE_WORDS_MS = 140;
const CLOSE_BACK_MS = 420;
const CLOSE_BLOOM_MS = 300;
const SEAT_DIP = { by: 0.04, from: 500, over: 60 } as const;

export type Mode = "launch" | "rest" | "drag" | "free" | "snap" | "slow";
type Phase = "closed" | "open" | "closing";

export type Engine = {
	phase: Phase;
	mode: Mode;
	now: number;
	t0: number;
	o: Pt;
	no: NamePt;
	held: Pt;
	titleY: number;
	locked: boolean;
	reduced: boolean;
	still: boolean;
	spin: number;
	v: number;
	from: number;
	to: number;
	at: number;
	dragY: number;
	dragging: boolean;
	back: boolean;
	backFrom: number;
	backAt: number;
	rattleAt: number;
	landed: boolean;
	tc: number;
	touchAt: number;
	cp: Pose | null;
};

export const EV = { faced: 2, idle: 4, landed: 1, none: 0, seated: 3 } as const;

function rattle(e: Engine) {
	"worklet";
	if (e.rattleAt < 0) {
		return 0;
	}
	const a = e.now - e.rattleAt;
	return a < RATTLE_MS
		? RATTLE.amp * Math.exp(-a / RATTLE.decay) * Math.sin(a / RATTLE.period)
		: 0;
}

function sway(age: number) {
	"worklet";
	const sw = Math.min(1, (age - SWAY_FROM_MS) / SWAY_IN_MS);
	const ph = ((age - SWAY_FROM_MS) / SWAY_PERIOD_MS) * TAU;
	return { x: SWAY * Math.sin(ph) * sw, y: SWAY * Math.cos(ph) * sw };
}

export function poseAt(e: Engine, age: number): Pose {
	"worklet";
	const s = age / 1000;
	const rm = e.reduced;
	const xp = rm ? 1 : fs(s, FLY_X[0], FLY_X[1]);
	const yp = rm ? 1 : fs(s, FLY_Y[0], FLY_Y[1]);
	const rp = rm ? 1 : fs(s, FLY_R[0], FLY_R[1]);
	const drag = e.dragY;
	const shrink = 1 - PULL.shrink * clamp(drag / PULL.over);
	const details = 1 - clamp(drag / PULL.words);
	const spin = e.mode === "launch" ? TAU * fs(s, TURN[0], TURN[1]) : e.spin;
	let tiltX = rm
		? 0
		: FLIGHT_TILT * Math.sin(Math.PI * clamp(age / FLIGHT_TILT_MS));
	let tiltY = 0;
	if (!rm && age > SWAY_FROM_MS && !e.dragging && !e.still) {
		const w = sway(age);
		tiltX += w.x;
		tiltY += w.y;
	}
	const earned = !e.locked;
	const rvA: number[] = [];
	const rvY: number[] = [];
	for (let i = 0; i < REVEAL_AT.length; i++) {
		const t = age - (rm ? 0 : REVEAL_AT[i]);
		rvA.push(
			clamp(t / (rm ? FADE_MS : REVEAL_FADE_MS)) *
				(i === RV.chrome ? 1 : details)
		);
		rvY.push(rm ? 0 : REVEAL_RISE * (1 - easeOut(t / REVEAL_RISE_MS)));
	}
	const settle = rm ? 1 : easeOut(age / RECEDE_MS);
	return {
		alpha: rm ? clamp(age / FADE_MS) : 1,
		band: !earned || rm ? -1 : (age - LAND_MS) / BAND_MS,
		bloom: earned
			? (rm ? 1 : easeOut((age - LAND_MS) / BLOOM_MS)) * details
			: 0,
		cx: lerp(e.o.x, e.held.x, xp),
		cy: lerp(e.o.y, e.held.y, yp) + drag,
		dim: settle * (earned ? DIM.earned : DIM.locked),
		mt: !earned || rm || e.still || age < LAND_MS ? -1 : age - LAND_MS,
		nameA: 1 - NAME_FADE * clamp(drag / PULL.name),
		ns: lerp(e.no.s, 1, rp),
		nx: lerp(e.no.x, e.held.x, xp),
		ny: lerp(e.no.y, e.titleY, yp) + drag * NAME_FOLLOW,
		power: 1 - POWER_FADE * clamp(drag / PULL.colour),
		r: lerp(e.o.r, e.held.r, rp) * shrink,
		recede: settle,
		roll: rattle(e),
		rvA,
		rvY,
		spin,
		spread: rm ? 1 : easeOut((age - SPREAD.from) / SPREAD.over),
		tiltX,
		tiltY,
	};
}

function closeAt(cp: Pose, e: Engine, c: number): Pose {
	"worklet";
	const rm = e.reduced;
	const p = rm ? 0 : fs(c / 1000, CLOSE[0], CLOSE[1]);
	const back = 1 - easeOut(c / CLOSE_BACK_MS);
	const rvA: number[] = [];
	const rvY: number[] = [];
	for (const a of cp.rvA) {
		rvA.push(a * (1 - clamp(c / CLOSE_WORDS_MS)));
		rvY.push(0);
	}
	const dip = rm
		? 1
		: 1 - SEAT_DIP.by * easeOut((c - SEAT_DIP.from) / SEAT_DIP.over);
	return {
		alpha: rm ? 1 - clamp(c / FADE_MS) : 1,
		band: -1,
		bloom: cp.bloom * (1 - easeOut(c / CLOSE_BLOOM_MS)),
		cx: lerp(cp.cx, e.o.x, p),
		cy: lerp(cp.cy, e.o.y, p),
		dim: cp.dim * back,
		mt: -1,
		nameA: cp.nameA,
		ns: lerp(cp.ns, e.no.s, p),
		nx: lerp(cp.nx, e.no.x, p),
		ny: lerp(cp.ny, e.no.y, p),
		power: cp.power * back,
		r: lerp(cp.r, e.o.r, p) * dip,
		recede: cp.recede * back,
		roll: 0,
		rvA,
		rvY,
		spin: lerp(cp.spin, Math.round(cp.spin / TAU) * TAU, p),
		spread: cp.spread * back,
		tiltX:
			cp.tiltX * (1 - clamp(p)) -
			(rm ? 0 : CLOSE_TILT * Math.sin(Math.PI * clamp(c / CLOSE_MS))),
		tiltY: cp.tiltY * (1 - clamp(p)),
	};
}

function turnStep(e: Engine, dt: number): boolean {
	"worklet";
	if (e.mode === "free") {
		const s = dt / 1000;
		e.v *= Math.exp(-FRICTION * s);
		e.spin += e.v * s;
		if (Math.abs(e.v) < SETTLE_SPEED) {
			e.mode = "snap";
			e.from = e.spin;
			e.to = Math.round(e.spin / Math.PI) * Math.PI;
			e.at = e.now;
		}
		return false;
	}
	if (e.mode === "snap" || e.mode === "slow") {
		const slow = e.mode === "slow";
		const t = clamp((e.now - e.at) / (slow ? SLOW_MS : SNAP_MS));
		e.spin = lerp(e.from, e.to, slow ? easeIO(t) : easeOut(t));
		if (t >= 1) {
			e.mode = "rest";
			return true;
		}
	}
	return false;
}

export function step(e: Engine, dt: number): { pose: Pose; ev: number } {
	"worklet";
	e.now += dt;
	if (e.phase === "closed") {
		return { ev: EV.none, pose: closeAt(e.cp ?? REST_POSE, e, e.now - e.tc) };
	}
	if (e.phase === "closing") {
		const c = e.now - e.tc;
		const pose = closeAt(e.cp ?? poseAt(e, e.tc - e.t0), e, c);
		if (c < (e.reduced ? FADE_MS : CLOSE_MS)) {
			return { ev: EV.none, pose };
		}
		e.phase = "closed";
		return { ev: EV.seated, pose };
	}
	const age = e.now - e.t0;
	let ev: number = EV.none;
	if (e.mode === "launch" && age > LAUNCH_END_MS) {
		e.mode = "rest";
		e.spin = TAU;
	}
	if (turnStep(e, dt)) {
		ev = EV.faced;
	}
	if (e.back && !e.dragging) {
		const k = fs((e.now - e.backAt) / 1000, SPRING_BACK[0], SPRING_BACK[1]);
		e.dragY = e.backFrom * (1 - k);
		if (e.now - e.backAt > BACK_MS) {
			e.back = false;
			e.dragY = 0;
		}
	}
	if (e.rattleAt >= 0 && e.now - e.rattleAt >= RATTLE_MS) {
		e.rattleAt = -1;
	}
	const pose = poseAt(e, age);
	if (!e.landed && age >= LAND_MS) {
		e.landed = true;
		if (ev === EV.none) {
			ev = EV.landed;
		}
	}
	e.cp = pose;
	const resting =
		e.mode === "rest" &&
		!e.dragging &&
		!e.back &&
		e.rattleAt < 0 &&
		age > LAUNCH_END_MS;
	if (ev === EV.none && resting && e.now - e.touchAt > IDLE_MS) {
		ev = EV.idle;
	}
	return { ev, pose };
}

export function beginClose(e: Engine) {
	"worklet";
	if (e.phase !== "open") {
		return;
	}
	if (e.mode === "launch" && e.cp) {
		e.spin = e.cp.spin;
	}
	if (!e.cp) {
		e.cp = poseAt(e, e.now - e.t0);
	}
	e.phase = "closing";
	e.tc = e.now;
}

export function tapTurn(e: Engine): "rattle" | "faced" | "turning" | null {
	"worklet";
	if (e.phase !== "open") {
		return null;
	}
	e.touchAt = e.now;
	if (e.locked) {
		e.rattleAt = e.now;
		return "rattle";
	}
	if (e.mode === "launch" && e.cp) {
		e.spin = e.cp.spin;
	}
	if (e.reduced) {
		e.spin = showsBack(e.spin) ? 0 : Math.PI;
		e.mode = "rest";
		return "faced";
	}
	e.mode = "slow";
	e.from = e.spin;
	e.to = Math.round((e.spin + Math.PI) / Math.PI) * Math.PI;
	e.at = e.now;
	return "turning";
}
