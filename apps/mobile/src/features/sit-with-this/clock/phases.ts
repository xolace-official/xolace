/**
 * What each moment of a beat looks like, pure (handoff §4–5, board `frame()`):
 * the seam light's target, which caption line a phase shows, the hand pulse,
 * the end's swell, a line's leaving, the label's rise, and what VoiceOver
 * says at a phase. Worklets where the clock calls them.
 */
import { COPY } from "../copy";
import type { Beat } from "../sit-model";
import { bezier, clamp01, INHALE, type PhaseKind, TOP } from "./breath";

/** The seam light `g` by moment. */
export const G = {
	close: 0.12,
	hand: 0.15,
	inBase: 0.12,
	inBy: 0.5,
	rest: 0.1,
	top: 0.62,
	topBy: 0.38,
} as const;

/** The seam light while breathing: rising in, swelling at the top, falling out. */
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

/**
 * Which caption line a phase shows: Make room's (`split`) in-line on the
 * inhale, out-line on the exhale, and the top keeps whichever is up. One line
 * is always 0.
 */
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

/** Hand pulse (production's haptic beat): every 2.8 s, skipped with under 1.4 s left. */
const PULSE_MS = 2800;
/** The arcs' visual pulse is the first .8 s of each. */
const PULSE_SHOW_MS = 800;

export type HandPulse = {
	/** Which pulse this is. */
	k: number;
	/** It plays (enough of the beat is left). */
	live: boolean;
	/** The arcs' closeness, 0 → 1 → 0 over .8 s. */
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

/** "You stayed.": the seam swells once, peaking at .7 s. */
export function closeSeam(ms: number): number {
	"worklet";
	return (
		G.close + (1 - G.close) * Math.exp(-(((ms - SWELL.at) / SWELL.width) ** 2))
	);
}

/** A line (and a breath beat's caption) leaves over .28 s before its beat ends. */
const LEAVE_MS = 280;

export function leavingAt(t: number, d: number): number {
	"worklet";
	return clamp01((t - (d - LEAVE_MS)) / LEAVE_MS);
}

const RISE_PT = 10;

/** The label's and caption's rise (bezier(.2, .8, .2, 1)); a plain fade under reduced motion. */
export function riseOf(e: number, reduced: boolean) {
	"worklet";
	const k = bezier(0.2, 0.8, 0.2, 1, e);
	return reduced
		? { opacity: e, translateY: 0 }
		: { opacity: k, translateY: RISE_PT * (1 - k) };
}

/**
 * What VoiceOver hears as a phase starts: its label, with the caption that
 * phase shows (Make room's line for it, or a breath's one line on its first
 * phase, so a single-line caption is heard once and not cut off).
 */
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
