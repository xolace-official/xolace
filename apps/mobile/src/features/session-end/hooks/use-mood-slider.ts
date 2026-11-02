import { useEffect, useMemo, useRef } from "react";
import { Gesture } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { SAME, snap, stepOf } from "@/features/session-end/mood-scale";

type Handlers = {
	/** The drag crossed into a new step (0 is the centre). */
	onStep: (step: number) => void;
	/** The thumb reached either end. */
	onEdge: () => void;
	/** The finger lifted (or a screen reader nudged); the position is the answer. */
	onRelease: (position: number) => void;
};

const NUDGE = 0.1;
const ACTIVE_OFFSET_X = 4;
const FAIL_OFFSET_Y = 14;

/** The mood slider's gesture. The position lives on the UI thread; JS hears only step
 * changes, the ends and the release, never a frame. */
export function useMoodSlider(inset: number, handlers: Handlers) {
	const pos = useSharedValue(SAME);
	const width = useSharedValue(0);
	const step = useSharedValue(0);
	const edge = useSharedValue(0);
	// Handlers go through a ref so the gesture never changes mid-drag: a GestureDetector
	// handed a new gesture cancels the pan in progress.
	const handlersRef = useRef(handlers);
	useEffect(() => {
		handlersRef.current = handlers;
	});

	// useMemo keeps the gesture's identity stable (correctness, not speed); every value it
	// captures is stable.
	const gesture = useMemo(() => {
		const fireStep = (s: number) => handlersRef.current.onStep(s);
		const fireEdge = () => handlersRef.current.onEdge();
		const fireRelease = (v: number) => handlersRef.current.onRelease(v);
		const move = (x: number) => {
			"worklet";
			const span = Math.max(1, width.get() - inset * 2);
			const v = snap(Math.min(1, Math.max(0, (x - inset) / span)));
			pos.set(v);
			const s = stepOf(v);
			if (s !== step.get()) {
				step.set(s);
				scheduleOnRN(fireStep, s);
			}
			let e = 0;
			if (v <= 0) {
				e = -1;
			} else if (v >= 1) {
				e = 1;
			}
			if (e !== 0 && e !== edge.get()) {
				scheduleOnRN(fireEdge);
			}
			edge.set(e);
		};
		const pan = Gesture.Pan()
			.activeOffsetX([-ACTIVE_OFFSET_X, ACTIVE_OFFSET_X])
			.failOffsetY([-FAIL_OFFSET_Y, FAIL_OFFSET_Y])
			.onStart((e) => move(e.x))
			.onUpdate((e) => move(e.x))
			.onEnd(() => scheduleOnRN(fireRelease, pos.get()));
		const tap = Gesture.Tap().onEnd((e) => {
			move(e.x);
			scheduleOnRN(fireRelease, pos.get());
		});
		return Gesture.Exclusive(pan, tap);
	}, [inset, pos, width, step, edge]);

	/** Screen reader increment / decrement: one step-sized nudge, answered at once. */
	const nudge = (dir: 1 | -1) => {
		const v = snap(Math.min(1, Math.max(0, pos.get() + dir * NUDGE)));
		const s = stepOf(v);
		pos.set(v);
		step.set(s);
		handlersRef.current.onStep(s);
		handlersRef.current.onRelease(v);
	};

	const reset = () => {
		pos.set(SAME);
		step.set(0);
		edge.set(0);
	};

	return { gesture, inset, nudge, pos, reset, width };
}

export type MoodSlider = ReturnType<typeof useMoodSlider>;
