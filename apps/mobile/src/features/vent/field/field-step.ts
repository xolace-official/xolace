import { type FieldCmd, PHASE } from "@/features/vent/field/field-control";
import { explodeAt } from "@/features/vent/field/particle-burn";
import {
	BASE_RADIUS,
	MAX_RADIUS,
	NEAR_MS,
	RM_FADE_MS,
	SCATTER_MS,
	SILENCE_MS,
} from "@/features/vent/field/particle-config";
import { clamp01 } from "@/features/vent/field/particle-render";

/**
 * The field's per-frame state, stepped on the UI thread (production's frame callback, with the
 * board's v2 changes): the clock, the turn, the voice's level smoothed into radius and warmth,
 * the last 15 s, and the burn's own clock.
 */
export type FieldState = {
	now: number;
	/** v2: the turn is integrated, so it can slow near the end without scaling time. */
	spin: number;
	sm: number;
	r: number;
	w: number;
	end: number;
	seq: number;
	phase: number;
	start: number;
	enter0: number;
	fromSparse: boolean;
	rec0: number;
	recOff: number;
	ceilMs: number;
	r0: number;
	w0: number;
	skip: number;
	flx: number;
	fly: number;
	notified: boolean;
	/** When the words began to burn, or -1 until their image is ready. */
	ash0: number;
};

export const FIELD_START: FieldState = {
	ash0: -1,
	ceilMs: 0,
	end: 0,
	enter0: 0,
	flx: 0,
	fly: 0,
	fromSparse: false,
	notified: false,
	now: 0,
	phase: -1,
	r: BASE_RADIUS,
	r0: BASE_RADIUS,
	rec0: 0,
	recOff: 0,
	seq: -1,
	skip: -1,
	sm: 0,
	spin: 0,
	start: 0,
	w: 0,
	w0: 0,
};

/** A settled field: the entry and its pulse are long over. */
const SETTLED_MS = 6000;
/** v2: the level rises with a word and settles between words (production: 0.12 both ways). */
const RISE = 0.14;
const FALL = 0.05;

export type StepIn = {
	dt: number;
	cmd: FieldCmd;
	level: number;
	pinch: number;
	rm: boolean;
};

export const burnEnd = (s: FieldState, rm: boolean) => {
	"worklet";
	return rm ? RM_FADE_MS + 600 : explodeAt(s.skip) + SCATTER_MS + SILENCE_MS;
};

/** One frame. Returns true on the frame the burn (with its silence) is over. */
export function stepField(s: FieldState, i: StepIn): boolean {
	"worklet";
	s.now += i.dt;
	if (i.cmd.seq !== s.seq) {
		const prev = s.phase;
		s.seq = i.cmd.seq;
		s.phase = i.cmd.phase;
		s.start = s.now;
		if (s.phase === PHASE.field && prev !== PHASE.rec) {
			s.enter0 = s.now;
			s.fromSparse = prev === PHASE.sparse;
		}
		if (s.phase === PHASE.rec) {
			s.rec0 = s.now;
			s.recOff = i.cmd.recOff;
			s.ceilMs = i.cmd.ceilMs;
		}
		if (i.cmd.settled) {
			s.enter0 = s.now - SETTLED_MS;
		}
		if (s.phase === PHASE.burn) {
			// Snapshot the live field so the gather starts from where it is.
			s.r0 = s.r;
			s.w0 = s.w;
			s.skip = i.cmd.skip;
			s.flx = i.cmd.flx;
			s.fly = i.cmd.fly;
			s.notified = false;
		}
		if (s.phase === PHASE.ash) {
			s.ash0 = -1;
		}
	}
	const rec = s.phase === PHASE.rec;
	s.end = rec
		? clamp01(1 - (s.ceilMs - (s.now - s.rec0 + s.recOff)) / NEAR_MS)
		: 0;
	// Production: the field turns at its own pace. v2: it slows by up to 45% near the end.
	s.spin += i.rm ? 0 : i.dt * (1 - 0.45 * s.end);
	const m = rec ? i.level : 0;
	s.sm += (m - s.sm) * (m > s.sm ? RISE : FALL);
	// v2, Reduce Motion: the voice warms the field but doesn't swell it.
	const tr =
		rec && !i.rm
			? BASE_RADIUS + s.sm * (MAX_RADIUS - BASE_RADIUS)
			: BASE_RADIUS;
	s.r += (tr - s.r) * 0.06;
	s.w += ((rec ? s.sm : 0) - s.w) * 0.08;

	if (s.phase !== PHASE.burn) {
		return false;
	}
	const bt = s.now - s.start;
	// Pinch-spread: they chose to release, so it bursts at once from where it is (production).
	if (i.pinch > 0 && s.skip < 0 && !i.rm && bt < explodeAt(-1)) {
		s.skip = bt;
	}
	if (s.notified || bt <= burnEnd(s, i.rm)) {
		return false;
	}
	s.notified = true;
	return true;
}
