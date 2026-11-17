import { Skia, type SkPath } from "@shopify/react-native-skia";
import { useEffect, useRef, useState } from "react";
import {
	type SharedValue,
	useFrameCallback,
	useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
	ARC,
	type Arcs,
	approach,
	arcsAt,
	type Box,
	bezier,
	breathAt,
	type Corners,
	clamp01,
	INHALE,
	TOP,
} from "./breath";
import {
	type ClockCfg,
	type ClockEvents,
	IDLE_CFG,
	K,
	MODE,
} from "./clock-config";

const MAX_DT = 100;
const FRAME_MS = 16;
/** The label and caption rise over .45 s; a line leaves over .28 s. */
const LABEL_MS = 450;
const LEAVE_MS = 280;
/** Board `frame()`: p eases with τ 260 ms outside breath beats, the seam light with τ 90 ms. */
const P_TAU = 260;
const G_TAU = 90;
/** Hand pulse (production's haptic beat): every 2.8 s, skipped with under 1.4 s left; the visual is the first .8 s. */
const PULSE_MS = 2800;
const PULSE_SHOW_MS = 800;
const HAND_P = 0.35;
const HAND_CLOSE = 10;
const LINK_AFTER_MS = 3000;
const DONE_AFTER_MS = 2000;
/** The end's seam swell and Done's drain are over by then. */
const CLOSE_RUN_MS = 4000;
const SWELL = { at: 700, width: 420 } as const;
const REDUCED_P = 0.5;
const EPS = 1e-4;
const CAPTION_STEP = 10;

/** The seam light `g` by phase (handoff §4). */
const G = {
	close: 0.12,
	hand: 0.15,
	inBase: 0.12,
	inBy: 0.5,
	rest: 0.1,
	top: 0.62,
	topBy: 0.38,
} as const;

function rrectPath(b: Box, c: Corners): SkPath {
	"worklet";
	// Skia scales the radii down when a side overflows, as the board's `rrect` does.
	return Skia.PathBuilder.Make()
		.addRRect({
			bottomLeft: { x: b.r * c.bottomLeft[0], y: b.r * c.bottomLeft[1] },
			bottomRight: { x: b.r * c.bottomRight[0], y: b.r * c.bottomRight[1] },
			rect: Skia.XYWHRect(b.x, b.y, b.w, b.h),
			topLeft: { x: b.r * c.topLeft[0], y: b.r * c.topLeft[1] },
			topRight: { x: b.r * c.topRight[0], y: b.r * c.topRight[1] },
		})
		.build();
}

function put(sv: SharedValue<number>, v: number) {
	"worklet";
	if (Math.abs(sv.get() - v) > EPS) {
		sv.set(v);
	}
}

type Memo = {
	serial: number;
	playRun: number;
	phase: number;
	pulse: number;
	ended: boolean;
	link: boolean;
	done: boolean;
	capStart: number;
};

/** One stable dispatcher per event, reading the latest handlers: the worklet never re-registers. */
function useEmit(events: ClockEvents) {
	const latest = useRef(events);
	useEffect(() => {
		latest.current = events;
	});
	const [emit] = useState(() => ({
		beatEnd: (s: number) => latest.current.beatEnd(s),
		doneReady: (s: number) => latest.current.doneReady(s),
		linkReady: () => latest.current.linkReady(),
		phase: (...a: Parameters<ClockEvents["phase"]>) =>
			latest.current.phase(...a),
		pulse: (s: number) => latest.current.pulse(s),
	}));
	return emit;
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
	const cfg = useSharedValue<ClockCfg>(IDLE_CFG);
	const frozenSv = useSharedValue(frozen);
	const settleSv = useSharedValue(settle);
	const reducedSv = useSharedValue(reduced);
	const size = useSharedValue({ H, W });
	const vt = useSharedValue(0);
	/** The beat (serial) `vt` belongs to: a view of a newer beat reads 0 until the clock catches up. */
	const at = useSharedValue(-1);
	const playT = useSharedValue(0);
	const closeT = useSharedValue(0);
	const p = useSharedValue(0);
	const g = useSharedValue<number>(G.rest);
	const lp = useSharedValue(0);
	const fb = useSharedValue(0);
	const frac = useSharedValue(0);
	const leave = useSharedValue(0);
	const lab = useSharedValue(-1);
	const labE = useSharedValue(0);
	const capIdx = useSharedValue(0);
	const capE = useSharedValue(0);
	const drawn = useSharedValue({ gap: ARC.GAP as number, H, p: -1, W, w: 0 });
	const geo = useSharedValue<Arcs>(arcsAt(W, H, 0, 0));
	const topPath = useSharedValue<SkPath>(Skia.PathBuilder.Make().build());
	const botPath = useSharedValue<SkPath>(Skia.PathBuilder.Make().build());
	const seen = useSharedValue<Memo>({
		capStart: 0,
		done: false,
		ended: false,
		link: false,
		phase: -1,
		playRun: -2,
		pulse: -1,
		serial: -2,
	});
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
			if (br.kind === INHALE) {
				gTarget = G.inBase + G.inBy * br.p;
			} else if (br.kind === TOP) {
				gTarget = G.top + G.topBy * Math.sin(Math.PI * br.u);
			} else {
				gTarget = G.top * br.p;
			}
			if (!br.done) {
				const key = br.cycle * CAPTION_STEP + br.step;
				if (key !== m.phase) {
					const first = m.phase < 0;
					m.phase = key;
					lab.set(br.kind);
					let nextCap = 0;
					if (c.split) {
						nextCap =
							br.kind === TOP ? capIdx.get() : Number(br.kind !== INHALE);
					}
					if (first || nextCap !== capIdx.get()) {
						capIdx.set(nextCap);
						m.capStart = t - br.ms;
					}
					scheduleOnRN(phase, c.serial, br.kind, br.d, nextCap);
				}
				put(labE, clamp01(br.ms / LABEL_MS));
				put(capE, clamp01((t - m.capStart) / LABEL_MS));
			}
		} else {
			if (playing && c.kind === K.haptic) {
				target = HAND_P;
				const k = Math.floor(t / PULSE_MS);
				const tIn = t - k * PULSE_MS;
				const live = c.d - k * PULSE_MS >= PULSE_MS / 2;
				const env =
					live && tIn < PULSE_SHOW_MS
						? Math.sin((Math.PI * tIn) / PULSE_SHOW_MS)
						: 0;
				gap = ARC.GAP - HAND_CLOSE * env;
				gTarget = G.hand + (1 - G.hand) * env;
				if (live && k !== m.pulse) {
					m.pulse = k;
					scheduleOnRN(pulse, c.serial);
				}
			} else if (c.mode === MODE.close) {
				const ct = closeT.get();
				gTarget =
					G.close +
					(1 - G.close) * Math.exp(-(((ct - SWELL.at) / SWELL.width) ** 2));
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
			topPath.set(rrectPath(a.top, ARC.TOP_CORNERS));
			botPath.set(rrectPath(a.bot, ARC.BOT_CORNERS));
		}

		// A line (and a breath beat's caption) leaves over .28 s before its beat ends.
		const leaving =
			timed && c.kind !== K.haptic
				? clamp01((t - (c.d - LEAVE_MS)) / LEAVE_MS)
				: 0;
		put(leave, leaving);
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

const RISE_PT = 10;

/** The label's and caption's rise (bezier(.2, .8, .2, 1)); a plain fade under reduced motion. */
export function riseOf(e: number, reduced: boolean) {
	"worklet";
	const k = bezier(0.2, 0.8, 0.2, 1, e);
	return reduced
		? { opacity: e, translateY: 0 }
		: { opacity: k, translateY: RISE_PT * (1 - k) };
}
