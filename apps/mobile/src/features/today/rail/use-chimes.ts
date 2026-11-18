import { useEffect, useRef } from "react";
import {
	type FrameCallback,
	type SharedValue,
	useAnimatedScrollHandler,
	useFrameCallback,
	useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

/**
 * The rail hangs like chimes (wind-chime-list): each tile is a damped
 * pendulum kicked by the rail's smoothed acceleration, a beat later per tile.
 * One frame callback; it starts on a scroll and stops itself once the swing
 * dies down. Buffers are preallocated: nothing allocates per frame.
 */
const GAIN = 0.0018;
const ZETA = 0.22;
const MAX_SWING = 0.6;
const ROW_DELAY = 0.04;
const SETTLED = 0.01;
const MAX_ACCEL = 9000;
const SMOOTH = 0.35;
/** About 200 ms of history at 120 Hz: enough for the last tile's delay. */
const HISTORY = 32;

function hash(i: number) {
	"worklet";
	const s = Math.sin(i * 12.9898 + 78.233) * 43_758.5453;
	return s - Math.floor(s);
}
/** 1.0–2.4 Hz by tile, as rowOmega. */
function omega(i: number) {
	"worklet";
	return 2 * Math.PI * (1.0 + 1.4 * hash(i + 7));
}
/** Neighbours swing opposite ways. */
function dir(i: number) {
	"worklet";
	return (i % 2 === 0 ? 1 : -1) * (0.8 + 0.4 * hash(i * 3 + 1));
}
function soft(x: number) {
	"worklet";
	return MAX_SWING * Math.tanh(x / MAX_SWING);
}

type Sim = {
	th: number[];
	w: number[];
	hist: number[];
	histT: number[];
	head: number;
	lastX: number;
	vs: number;
	now: number;
};

/** One pendulum per tile, up to the rail's four (`RAIL_MAX`). */
export function useChimes(count: number, reduced: boolean) {
	const railX = useSharedValue(0);
	const running = useSharedValue(false);
	const angles: SharedValue<number>[] = [
		useSharedValue(0),
		useSharedValue(0),
		useSharedValue(0),
		useSharedValue(0),
	];
	const sim = useSharedValue<Sim>({
		head: 0,
		hist: new Array<number>(HISTORY).fill(0),
		histT: new Array<number>(HISTORY).fill(-1),
		lastX: 0,
		now: 0,
		th: [0, 0, 0, 0],
		vs: 0,
		w: [0, 0, 0, 0],
	});

	// The loop starts on a scroll and stops itself; both happen from worklets via the JS thread.
	const loopRef = useRef<FrameCallback | null>(null);
	const start = () => loopRef.current?.setActive(true);
	const stop = () => loopRef.current?.setActive(false);

	const loop = useFrameCallback((frame) => {
		const s = sim.get();
		const dt = Math.min(frame.timeSincePreviousFrame ?? 16, 50) / 1000;
		s.now += dt;
		const x = railX.get();
		const v = (x - s.lastX) / Math.max(dt, 1e-3);
		s.lastX = x;
		const vs = s.vs + (v - s.vs) * SMOOTH;
		const a = Math.max(
			-MAX_ACCEL,
			Math.min(MAX_ACCEL, (vs - s.vs) / Math.max(dt, 1e-3))
		);
		s.vs = vs;
		s.head = (s.head + 1) % HISTORY;
		s.hist[s.head] = a;
		s.histT[s.head] = s.now;
		let energy = Math.abs(a) * GAIN;
		for (let i = 0; i < count; i += 1) {
			// The rail's acceleration this tile's delay ago.
			const want = s.now - i * ROW_DELAY;
			let kick = 0;
			for (let k = 0; k < HISTORY; k += 1) {
				const j = (s.head - k + HISTORY) % HISTORY;
				if ((s.histT[j] ?? -1) >= 0 && (s.histT[j] ?? 0) <= want) {
					kick = s.hist[j] ?? 0;
					break;
				}
			}
			const w0 = omega(i);
			const th = s.th[i] ?? 0;
			const w = s.w[i] ?? 0;
			const acc = -w0 * w0 * th - 2 * ZETA * w0 * w + GAIN * dir(i) * kick;
			s.w[i] = w + acc * dt;
			s.th[i] = th + (s.w[i] ?? 0) * dt;
			angles[i]?.set(soft(s.th[i] ?? 0));
			energy = Math.max(
				energy,
				Math.abs(s.th[i] ?? 0) + Math.abs(s.w[i] ?? 0) * 0.1
			);
		}
		if (energy < SETTLED && Math.abs(vs) < 1) {
			for (let i = 0; i < count; i += 1) {
				s.th[i] = 0;
				s.w[i] = 0;
				angles[i]?.set(0);
			}
			running.set(false);
			scheduleOnRN(stop);
		}
	}, false);

	useEffect(() => {
		loopRef.current = loop;
		return () => loop.setActive(false);
	}, [loop]);

	const onScroll = useAnimatedScrollHandler({
		onScroll: (e) => {
			railX.set(e.contentOffset.x);
			if (reduced || running.get()) {
				return;
			}
			running.set(true);
			const s = sim.get();
			s.lastX = e.contentOffset.x;
			s.vs = 0;
			scheduleOnRN(start);
		},
	});

	return { angles, onScroll };
}
