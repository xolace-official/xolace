import { COPY } from "../copy";
import type { Beat } from "../sit-model";
import { bezier, clamp01, INHALE, type PhaseKind, TOP } from "./breath";

export const G = {
	close: 0.12,
	hand: 0.15,
	inBase: 0.12,
	inBy: 0.5,
	rest: 0.1,
	top: 0.62,
	topBy: 0.38,
} as const;

export function breathSeam(kind: PhaseKind, p: number, u: number): number {
	"worklet";
	if (kind === INHALE) {
		return G.inBase + G.inBy * p;
	}
	if (kind === TOP) {
		return G.top + G.topBy * Math.sin(Math.PI * u);
	}
	return G.top * p;
}

export function captionFor(
	split: boolean,
	kind: PhaseKind,
	current: number
): number {
	"worklet";
	if (!split) {
		return 0;
	}
	if (kind === TOP) {
		return current;
	}
	return kind === INHALE ? 0 : 1;
}

const PULSE_MS = 2800;
const PULSE_SHOW_MS = 800;

export type HandPulse = {
	k: number;
	live: boolean;
	env: number;
};

export function handPulse(t: number, d: number): HandPulse {
	"worklet";
	const k = Math.floor(t / PULSE_MS);
	const tIn = t - k * PULSE_MS;
	const live = d - k * PULSE_MS >= PULSE_MS / 2;
	const env =
		live && tIn < PULSE_SHOW_MS ? Math.sin((Math.PI * tIn) / PULSE_SHOW_MS) : 0;
	return { env, k, live };
}

const SWELL = { at: 700, width: 420 } as const;

export function closeSeam(ms: number): number {
	"worklet";
	return (
		G.close + (1 - G.close) * Math.exp(-(((ms - SWELL.at) / SWELL.width) ** 2))
	);
}

const LEAVE_MS = 280;

export function leavingAt(t: number, d: number): number {
	"worklet";
	return clamp01((t - (d - LEAVE_MS)) / LEAVE_MS);
}

const RISE_PT = 10;

export function riseOf(e: number, reduced: boolean) {
	"worklet";
	const k = bezier(0.2, 0.8, 0.2, 1, e);
	return reduced
		? { opacity: e, translateY: 0 }
		: { opacity: k, translateY: RISE_PT * (1 - k) };
}

export function phaseSaid(
	beat: Beat,
	kind: PhaseKind,
	caption: number,
	first: boolean
): string {
	const label = COPY.phases[kind];
	if (beat.k !== "breath" && beat.k !== "sync") {
		return label;
	}
	if (typeof beat.t !== "string") {
		return kind === TOP ? label : `${label}. ${beat.t[caption] ?? ""}`;
	}
	return first && beat.t ? `${beat.t} ${label}.` : label;
}
