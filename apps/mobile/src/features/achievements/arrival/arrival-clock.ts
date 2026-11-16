import { Presets } from "react-native-pulsar";
import {
	Easing,
	type SharedValue,
	useFrameCallback,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import {
	age,
	busy,
	CLOSE_GO_MS,
	type Eng,
	EV,
	FRICTION,
	FX_LOOP_MS,
	LAND,
	MODE,
	PH,
	SETTLE_SPEED,
	SNAP_MS,
	T,
} from "@/features/achievements/arrival/arrival-motion";
import { clamp, easeOut, lerp } from "@/features/achievements/motion-math";
import { playSessionComplete, tap } from "@/lib/haptics";

const MAX_DT = 64;
const WEEK = 7;

/** Spin under friction after a drag, then ease onto a face. Returns true as it settles. */
function turnStep(e: Eng, dt: number): boolean {
	"worklet";
	if (e.mode === MODE.free) {
		const s = dt / 1000;
		e.v *= Math.exp(-FRICTION * s);
		e.spin += e.v * s;
		if (Math.abs(e.v) < SETTLE_SPEED) {
			e.mode = MODE.snap;
			e.from = e.spin;
			e.goal = Math.round(e.spin / Math.PI) * Math.PI;
			e.at = e.now;
		}
		return false;
	}
	if (e.mode === MODE.snap) {
		const k = clamp((e.now - e.at) / SNAP_MS);
		e.spin = lerp(e.from, e.goal, easeOut(k));
		if (k >= 1) {
			e.mode = MODE.none;
			e.turned = true;
			return true;
		}
	}
	return false;
}

/** The milestone's and the badge's timed events, each once, as its time is crossed. */
function crossings(e: Eng, evs: number[]) {
	"worklet";
	if (e.phase === PH.ms) {
		const m = age(e, e.tm);
		const crossed = (x: number) => e.lm < x && m >= x;
		if (!e.rm) {
			if (crossed(T.roll)) {
				evs.push(EV.roll);
			}
			if (crossed(T.day0 + (WEEK - 1) * T.dayStep + T.today)) {
				evs.push(EV.today);
			}
			if (crossed(T.token)) {
				evs.push(EV.token);
			}
		}
		e.lm = m;
		return;
	}
	const a = age(e, e.ta);
	if (!e.rm && e.la < LAND && a >= LAND) {
		// The first badge throws its burst as it lands; after Next, the next one does.
		if (e.step === 0 || e.tu < 0) {
			e.tu = e.ta + LAND;
		}
		evs.push(EV.land);
	}
	e.la = a;
}

/**
 * One clock per arrival (§6): a frame callback steps the engine on the UI
 * thread and stops when nothing moves. `fa` is the badge's age for the fx
 * loops (glow, shimmer, sparkles), which carry on without the clock on one
 * 84 s linear loop once it stops. React hears only the events.
 */
export function useArrivalClock({
	eng,
	fa,
	onEvent,
}: {
	eng: SharedValue<Eng>;
	fa: SharedValue<number>;
	onEvent: (ev: number) => void;
}) {
	return useFrameCallback((f) => {
		const dt = Math.min(MAX_DT, f.timeSincePreviousFrame ?? 0);
		const evs: number[] = [];
		let loopFrom = -1;
		eng.modify((e) => {
			"worklet";
			const before = e.now;
			e.now += dt;
			if (turnStep(e, dt)) {
				evs.push(EV.faced);
			}
			crossings(e, evs);
			if (
				e.tc >= 0 &&
				before - e.tc <= CLOSE_GO_MS &&
				e.now - e.tc > CLOSE_GO_MS
			) {
				evs.push(EV.close);
			}
			if (busy(e)) {
				if (e.phase === PH.badge) {
					fa.set(Math.max(0, age(e, e.ta)));
				}
			} else {
				evs.push(EV.idle);
				if (e.phase === PH.badge && !e.rm) {
					loopFrom = age(e, e.ta);
				}
			}
			return e;
		});
		// Production's fx loops carry on from here without the clock.
		if (loopFrom >= 0) {
			fa.set(loopFrom);
			fa.set(
				withRepeat(
					withTiming(loopFrom + FX_LOOP_MS, {
						duration: FX_LOOP_MS,
						easing: Easing.linear,
						...PLAY_AS_CHOSEN,
					}),
					-1,
					false
				)
			);
		}
		for (const ev of evs) {
			scheduleOnRN(onEvent, ev);
		}
	}, false);
}

/** The moments the clock reports, felt (arrivals §4): Thud on the roll, a flick for today, Feather on the freeze, Bloom on landing, a tick on a face. */
export function playArrivalHaptic(ev: number) {
	if (ev === EV.roll) {
		Presets.thud();
	} else if (ev === EV.today) {
		Presets.flick();
	} else if (ev === EV.token) {
		Presets.feather();
	} else if (ev === EV.land) {
		playSessionComplete();
	} else if (ev === EV.faced) {
		tap();
	}
}
