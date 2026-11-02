// Drives a Pose on the UI thread. Moves spring between poses (a little overshoot reads as
// life), with blinking, an idle breath, quick gaze overrides and a nod on top.

import { useCallback, useEffect } from "react";
import {
	useDerivedValue,
	useFrameCallback,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { lerpPose, NEUTRAL, type Pose } from "./pose";

// Tuned by feel in the prototypes (proto/xolace-face): underdamped on purpose, a character
// settling rather than UI snapping.
const MOVE_SPRING = { damping: 11, mass: 0.9, stiffness: 120 };
const LOOK_SPRING = { damping: 16, stiffness: 260 };
const REDUCED_MOVE_MS = 200;
const BLINK_CLOSE_MS = 70;
const BLINK_OPEN_MS = 120;
const BLINK_MIN_GAP_MS = 2200;
const BLINK_JITTER_MS = 3200;
const DOUBLE_BLINK_CHANCE = 0.2;
const NOD_DOWN_MS = 170;
const NOD_GAZE = 0.6;
const LISTEN_BROW = 0.35;
const LISTEN_LEAN = 0.2;
const MS_PER_S = 1000;

/** `running: false` stops the clock and the blinks, so a hidden face costs nothing. */
export function useFace(initial: Pose = NEUTRAL, running = true) {
	const reduced = useEffectiveReducedMotion();
	const from = useSharedValue(initial);
	const target = useSharedValue(initial);
	const t = useSharedValue(1);
	const lookX = useSharedValue(0);
	const lookY = useSharedValue(0);
	const blink = useSharedValue(1);
	const nodAmount = useSharedValue(0);
	const clock = useSharedValue(0);
	// The user's live voice level, 0–1, set by whoever owns the audio (Talk's level): it
	// leans in and lifts the brows a little.
	const listen = useSharedValue(0);

	useFrameCallback((frame) => {
		clock.set(frame.timeSinceFirstFrame / MS_PER_S);
	}, running && !reduced);

	useEffect(() => {
		if (!running) {
			return;
		}
		let timer: ReturnType<typeof setTimeout>;
		const schedule = () => {
			timer = setTimeout(
				() => {
					const close = withTiming(0, { duration: BLINK_CLOSE_MS });
					const open = withTiming(1, { duration: BLINK_OPEN_MS });
					blink.set(
						Math.random() < DOUBLE_BLINK_CHANCE
							? withSequence(close, open, close, open)
							: withSequence(close, open)
					);
					schedule();
				},
				BLINK_MIN_GAP_MS + Math.random() * BLINK_JITTER_MS
			);
		};
		schedule();
		return () => clearTimeout(timer);
	}, [blink, running]);

	const pose = useDerivedValue<Pose>(() => {
		const p = lerpPose(from.get(), target.get(), t.get());
		return {
			...p,
			browLift: p.browLift + listen.get() * LISTEN_BROW,
			eyeOpen: p.eyeOpen * blink.get(),
			gazeX: p.gazeX + lookX.get(),
			gazeY: p.gazeY + lookY.get() + nodAmount.get() * NOD_GAZE,
			lean: p.lean + listen.get() * LISTEN_LEAN,
			restless: reduced ? 0 : p.restless,
		};
	});

	// Stable, because placements call these from effects keyed on them.
	/** Moves to a new pose from wherever the face is now. A worklet too, so a gesture can
	 * drive it on the UI thread. */
	const to = useCallback(
		(next: Pose) => {
			"worklet";
			from.set(lerpPose(from.get(), target.get(), t.get()));
			target.set(next);
			t.set(0);
			t.set(
				reduced
					? withTiming(1, { duration: REDUCED_MOVE_MS })
					: withSpring(1, MOVE_SPRING)
			);
		},
		[from, reduced, t, target]
	);

	/** Glances away from the pose's own gaze; `look(0, 0)` returns to it. */
	const look = useCallback(
		(x: number, y: number) => {
			"worklet";
			lookX.set(withSpring(x, LOOK_SPRING));
			lookY.set(withSpring(y, LOOK_SPRING));
		},
		[lookX, lookY]
	);

	/** One gentle nod. Reduced motion drops it; the pose change still explains the moment. */
	const nod = useCallback(() => {
		"worklet";
		if (reduced) {
			return;
		}
		nodAmount.set(
			withSequence(
				withTiming(1, { duration: NOD_DOWN_MS }),
				withSpring(0, MOVE_SPRING)
			)
		);
	}, [nodAmount, reduced]);

	return { clock, listen, look, nod, nodAmount, pose, to };
}

export type FaceHandle = ReturnType<typeof useFace>;
