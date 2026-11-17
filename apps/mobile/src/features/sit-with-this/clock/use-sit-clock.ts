import { useEffect } from "react";
import {
	type SharedValue,
	useFrameCallback,
	useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { arcPath } from "./arc-path";
import { ARC, approach, arcsAt, breathAt, clamp01 } from "./breath";
import { type ClockEvents, K, MODE } from "./clock-config";
import { useClockValues } from "./clock-values";
import {
	breathSeam,
	captionFor,
	closeSeam,
	G,
	handPulse,
	leavingAt,
} from "./phases";
import { useEmit } from "./use-emit";

const MAX_DT = 100;
const FRAME_MS = 16;
/** The label and caption rise over .45 s. */
const LABEL_MS = 450;
/** Board `frame()`: p eases with τ 260 ms outside breath beats, the seam light with τ 90 ms. */
const P_TAU = 260;
const G_TAU = 90;
const HAND_P = 0.35;
const HAND_CLOSE = 10;
const LINK_AFTER_MS = 3000;
const DONE_AFTER_MS = 2000;
/** The end's seam swell and Done's drain are over by then. */
const CLOSE_RUN_MS = 4000;
const REDUCED_P = 0.5;
const EPS = 1e-4;
const CAPTION_STEP = 10;

function put(sv: SharedValue<number>, v: number) {
	"worklet";
	if (Math.abs(sv.get() - v) > EPS) {
		sv.set(v);
	}
}

export type SitClock = ReturnType<typeof useSitClock>;

type Options = {
	W: number;
	H: number;
	/** The screen is in front and the app is active: the loop runs. */
	running: boolean;
	/** Paused (or a dev state's held frame): time stands still. */
	frozen: boolean;
	/** A dev state's still: the lights settle at once instead of easing there. */
	settle?: boolean;
	reduced: boolean;
	events: ClockEvents;
};

/**
 * The one clock (handoff §5, board `frame()`). A single `useFrameCallback`
 * advances the beat's time, computes the breath, the wobble, the gap and the
 * seam light, builds both arcs' paths, and moves the label, the caption, the
 * thread and the face's breath. A phase change calls the JS side in the same
 * frame for the haptic and the announcement. Nothing here renders React, and
 * values are written only when they change, so a still canvas isn't redrawn.
 */
export function useSitClock({
	W,
	H,
	running,
	frozen,
	settle = false,
	reduced,
	events,
}: Options) {
	const values = useClockValues(W, H);
	const { cfg, vt, at, playT, closeT, p, g, lp, fb, frac, leave } = values;
	const { lab, labE, capIdx, capE, drawn, geo, topPath, botPath, seen } =
		values;
	const frozenSv = useSharedValue(frozen);
	const settleSv = useSharedValue(settle);
	const reducedSv = useSharedValue(reduced);
	const size = useSharedValue({ H, W });
	const { phase, pulse, beatEnd, linkReady, doneReady } = useEmit(events);

	const frame = useFrameCallback((info) => {
		// Paused: time stands still (the lights, the seam and the breath too), but a
		// beat that changes meanwhile is still picked up.
		const dt = frozenSv.get()
			? 0
			: Math.min(MAX_DT, info.timeSincePreviousFrame ?? FRAME_MS);
		// The eases' step: a still settles them at once.
		const ease = settleSv.get() ? Number.POSITIVE_INFINITY : dt;
		const c = cfg.get();
		const m = seen.get();
		if (c.serial !== m.serial) {
			m.serial = c.serial;
			m.phase = -1;
			m.pulse = -1;
			m.ended = false;
			m.done = false;
			m.capStart = 0;
			vt.set(c.seek);
			at.set(c.serial);
			// The end starts at 0 (a dev still may start it later).
			closeT.set(c.mode === MODE.close ? c.seek : 0);
		}
		if (c.playRun !== m.playRun) {
			m.playRun = c.playRun;
			m.link = false;
			playT.set(0);
		}
		const rm = reducedSv.get();
		const playing = c.mode === MODE.play;
		const timed = playing && c.d >= 0;
		let t = vt.get();
		if (timed) {
			t += dt;
			vt.set(t);
		}
		if (playing) {
			playT.set(playT.get() + dt);
		}
		if (c.mode === MODE.close && closeT.get() < CLOSE_RUN_MS) {
			closeT.set(closeT.get() + dt);
		}

		let target = 0;
		let wob = 0;
		let gap: number = ARC.GAP;
		let gTarget: number = G.rest;
		let light = -1;
		let pNow: number;
		const breathing = playing && (c.kind === K.breath || c.kind === K.sync);
		if (breathing) {
			const br = breathAt(c.steps, c.cyc, t);
			pNow = br.p;
			wob = br.wob;
			light = br.p;
			gTarget = breathSeam(br.kind, br.p, br.u);
			if (!br.done) {
				const key = br.cycle * CAPTION_STEP + br.step;
				if (key !== m.phase) {
					const first = m.phase < 0;
					m.phase = key;
					lab.set(br.kind);
					const nextCap = captionFor(c.split, br.kind, capIdx.get());
					if (first || nextCap !== capIdx.get()) {
						capIdx.set(nextCap);
						m.capStart = t - br.ms;
					}
					scheduleOnRN(phase, c.serial, br.kind, br.d, nextCap, first);
				}
				put(labE, clamp01(br.ms / LABEL_MS));
				put(capE, clamp01((t - m.capStart) / LABEL_MS));
			}
		} else {
			if (playing && c.kind === K.haptic) {
				target = HAND_P;
				const { k, live, env } = handPulse(t, c.d);
				gap = ARC.GAP - HAND_CLOSE * env;
				gTarget = G.hand + (1 - G.hand) * env;
				if (live && k !== m.pulse) {
					m.pulse = k;
					scheduleOnRN(pulse, c.serial);
				}
			} else if (c.mode === MODE.close) {
				const ct = closeT.get();
				gTarget = closeSeam(ct);
				if (!m.done && ct > DONE_AFTER_MS) {
					m.done = true;
					scheduleOnRN(doneReady, c.serial);
				}
			}
			pNow = approach(p.get(), target, ease, P_TAU);
			if (Math.abs(pNow - target) < EPS) {
				pNow = target;
			}
		}
		put(p, pNow);
		// Reduced motion: the arcs hold half way; only the light, the seam and the
		// label breathe (breathing-tide `tide.ts:89-108`).
		const lightNow = light < 0 ? pNow : light;
		let drawP = pNow;
		if (rm) {
			drawP = REDUCED_P;
			wob = 0;
			gap = ARC.GAP;
		}
		put(lp, lightNow);
		put(fb, breathing && !rm ? pNow : 0);
		let gNow = approach(g.get(), gTarget, ease, G_TAU);
		if (Math.abs(gNow - gTarget) < EPS) {
			gNow = gTarget;
		}
		put(g, gNow);

		// The arcs: rebuilt only when their geometry moved.
		const d0 = drawn.get();
		const sz = size.get();
		const moved =
			Math.abs(d0.p - drawP) > EPS ||
			Math.abs(d0.w - wob) > EPS ||
			Math.abs(d0.gap - gap) > EPS ||
			d0.W !== sz.W ||
			d0.H !== sz.H;
		if (moved) {
			drawn.set({ gap, H: sz.H, p: drawP, W: sz.W, w: wob });
			const a = arcsAt(sz.W, sz.H, drawP, wob, gap);
			geo.set(a);
			topPath.set(arcPath(a.top, ARC.TOP_CORNERS));
			botPath.set(arcPath(a.bot, ARC.BOT_CORNERS));
		}

		put(leave, timed && c.kind !== K.haptic ? leavingAt(t, c.d) : 0);
		put(frac, timed && c.d > 0 ? Math.min(1, t / c.d) : 0);
		if (timed && !m.ended && t >= c.d) {
			m.ended = true;
			scheduleOnRN(beatEnd, c.serial);
		}
		if (playing && !m.link && playT.get() > LINK_AFTER_MS) {
			m.link = true;
			scheduleOnRN(linkReady);
		}
	}, false);

	const { setActive } = frame;
	useEffect(() => {
		setActive(running);
		return () => setActive(false);
	}, [running, setActive]);
	useEffect(() => {
		frozenSv.set(frozen);
	}, [frozen, frozenSv]);
	useEffect(() => {
		settleSv.set(settle);
	}, [settle, settleSv]);
	useEffect(() => {
		reducedSv.set(reduced);
	}, [reduced, reducedSv]);
	useEffect(() => {
		size.set({ H, W });
	}, [W, H, size]);

	return {
		at,
		botPath,
		capE,
		capIdx,
		cfg,
		closeT,
		fb,
		frac,
		g,
		geo,
		lab,
		labE,
		leave,
		lp,
		p,
		topPath,
		vt,
	};
}

/** Beat time for a view of beat `serial`: 0 until the clock has started that beat. */
export function beatTime(clock: Pick<SitClock, "at" | "vt">, serial: number) {
	"worklet";
	return clock.at.get() === serial ? clock.vt.get() : 0;
}
