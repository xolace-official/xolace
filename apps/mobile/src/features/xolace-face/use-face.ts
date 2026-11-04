// Drives a Pose on the UI thread. Moves spring between poses (a little overshoot reads as
// life), with blinking, an idle breath, quick gaze overrides, a nod, a hop and a talking
// mouth on top.

import { useCallback, useEffect } from "react";
import {
	ReduceMotion,
	useDerivedValue,
	useFrameCallback,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { isUIRuntime, scheduleOnUI } from "react-native-worklets";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { lerpPose, mouthWhileTalking, NEUTRAL, type Pose } from "./pose";

// Tuned by feel in the prototypes (proto/xolace-face): underdamped on purpose, a character
// settling rather than UI snapping.
export const MOVE_SPRING = { damping: 11, mass: 0.9, stiffness: 120 };
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
const HOP_UP_MS = 180;
const TALK_FADE_MS = 160;
const TALK_SQUASH = 0.25;
const TALK_SQUASH_HZ = 1.4;

/** Out to 1 and springs back: a nod or a hop. */
const pulse = (outMs: number) => {
	"worklet";
	return withSequence(
		withTiming(1, { duration: outMs }),
		withSpring(0, MOVE_SPRING)
	);
};
const MS_PER_S = 1000;
const FRAME_MS = 16;
const MAX_FRAME_MS = 48;

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
	const hopAmount = useSharedValue(0);
	// 0 … 1, eased so the mouth doesn't snap shut mid-word when talking stops.
	const talking = useSharedValue(0);
	const clock = useSharedValue(0);
	// The user's live voice level, 0–1, set by whoever owns the audio (Talk's level): it
	// leans in and lifts the brows a little.
	const listen = useSharedValue(0);

	// Accumulated from frame deltas, so stopping and starting again resumes where it left off;
	// a dropped frame is clamped so a hitch doesn't play back as a lurch.
	const frame = useFrameCallback((info) => {
		const delta = Math.min(
			info.timeSincePreviousFrame ?? FRAME_MS,
			MAX_FRAME_MS
		);
		clock.set(clock.get() + delta / MS_PER_S);
	}, false);
	// `useFrameCallback` reads its autostart flag only on mount, and the motion preference can
	// load or change after that.
	const { setActive } = frame;
	const animating = running && !reduced;
	useEffect(() => {
		setActive(animating);
		return () => setActive(false);
	}, [animating, setActive]);

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
		const c = clock.get();
		// Reduced motion keeps the pose's own mouth: the words on screen say it's talking.
		const talkAmount = reduced ? 0 : talking.get();
		return {
			...p,
			browLift: p.browLift + listen.get() * LISTEN_BROW,
			eyeOpen: p.eyeOpen * blink.get(),
			gazeX: p.gazeX + lookX.get(),
			gazeY: p.gazeY + lookY.get() + nodAmount.get() * NOD_GAZE,
			lean: p.lean + listen.get() * LISTEN_LEAN,
			mouthOpen: p.mouthOpen + talkAmount * mouthWhileTalking(c),
			restless: reduced ? 0 : p.restless,
			squash:
				p.squash +
				talkAmount * TALK_SQUASH * Math.sin(c * TALK_SQUASH_HZ * Math.PI * 2),
		};
	});

	// Reads where the face is now, so it runs on the UI thread: from JS each read mid-spring
	// would block on a sync hop, and the writes would land frames after that snapshot.
	const move = useCallback(
		(next: Pose) => {
			"worklet";
			from.set(lerpPose(from.get(), target.get(), t.get()));
			target.set(next);
			t.set(0);
			// `ReduceMotion.Never`, or the app-wide reduced setting finishes the ease in one frame.
			t.set(
				reduced
					? withTiming(1, {
							duration: REDUCED_MOVE_MS,
							reduceMotion: ReduceMotion.Never,
						})
					: withSpring(1, MOVE_SPRING)
			);
		},
		[from, reduced, t, target]
	);

	// Stable, because placements call these from effects keyed on them.
	/** Moves to a new pose from wherever the face is now. A worklet too, so a gesture can
	 * drive it on the UI thread. */
	const to = useCallback(
		(next: Pose) => {
			"worklet";
			if (isUIRuntime()) {
				move(next);
			} else {
				scheduleOnUI(move, next);
			}
		},
		[move]
	);

	/** Shows a pose exactly, cancelling any move. For a caller that springs the pose's input
	 * itself every frame: `to` per frame restarts its spring from rest, so it lags. */
	const hold = useCallback(
		(next: Pose) => {
			"worklet";
			from.set(next);
			target.set(next);
			t.set(1);
		},
		[from, t, target]
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
		nodAmount.set(pulse(NOD_DOWN_MS));
	}, [nodAmount, reduced]);

	/** One small happy hop. Dropped under reduced motion, like the nod. */
	const hop = useCallback(() => {
		"worklet";
		if (!reduced) {
			hopAmount.set(pulse(HOP_UP_MS));
		}
	}, [hopAmount, reduced]);

	/** Moves the mouth as if speaking, on top of the pose, until `talk(false)`. */
	const talk = useCallback(
		(on: boolean) => {
			"worklet";
			talking.set(withTiming(on ? 1 : 0, { duration: TALK_FADE_MS }));
		},
		[talking]
	);

	return {
		clock,
		hold,
		hop,
		hopAmount,
		listen,
		look,
		nod,
		nodAmount,
		pose,
		talk,
		to,
	};
}

export type FaceHandle = ReturnType<typeof useFace>;
