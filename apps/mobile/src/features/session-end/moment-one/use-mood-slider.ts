import { useRef } from "react";
import {
	useExclusiveGestures,
	usePanGesture,
	useTapGesture,
} from "react-native-gesture-handler";
import {
	type SharedValue,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { centreOf, SAME, snap, stepBy, stepOf } from "../mood-scale";
import { EASE, SLIDER } from "../session-look";

/** A tap's thumb glides there: 140 ms, cubic-bezier(.5, 1, .89, 1). */
const GLIDE = {
	duration: SLIDER.glideMs,
	easing: EASE.glide,
	...PLAY_AS_CHOSEN,
};
const PLACE = { dampingRatio: 1, duration: 300, ...PLAY_AS_CHOSEN };

export type SliderHandlers = {
	/** The finger touched the track (Not sure clears). */
	onTouch: () => void;
	/** The position crossed into a new step (0 is the centre). */
	onStep: (step: number) => void;
	/** The thumb reached either end. */
	onEdge: () => void;
	/** The finger lifted (or VoiceOver adjusted): the position is the answer. */
	onRelease: (position: number) => void;
};

/**
 * Production's old `use-mood-slider.ts`, on Gesture Handler 3's hooks: an exclusive pan + tap. The position lives
 * on the UI thread (`pos`, which the thumb, the face's follow, the float, the shadow and the light all
 * read); JS hears only a new step, an end and the release, never a frame. While held the rail swells
 * and the thumb grows (`grab`). A tap jumps to the point and releases at once; the thumb glides there.
 */
const IGNORE: SliderHandlers = {
	onEdge: () => undefined,
	onRelease: () => undefined,
	onStep: () => undefined,
	onTouch: () => undefined,
};

export function useMoodSlider(
	inset: number,
	flags: { touched: SharedValue<number>; driving: SharedValue<number> }
) {
	const { touched, driving } = flags;
	const pos = useSharedValue(SAME);
	const width = useSharedValue(0);
	const step = useSharedValue(0);
	const edge = useSharedValue(0);
	const grab = useSharedValue(0);
	// Whoever listens (`listen`) is read through a ref, so the worklets never capture a stale callback.
	const ref = useRef(IGNORE);
	/** Who hears the slider: set from an effect, once per render. */
	const listen = (h: SliderHandlers) => {
		ref.current = h;
	};
	const fireTouch = () => ref.current.onTouch();
	const fireStep = (s: number) => ref.current.onStep(s);
	const fireEdge = () => ref.current.onEdge();
	const fireRelease = (v: number) => ref.current.onRelease(v);

	const move = (x: number, glide: boolean) => {
		"worklet";
		const span = Math.max(1, width.get() - inset * 2);
		const v = snap(Math.min(1, Math.max(0, (x - inset) / span)));
		pos.set(glide ? withTiming(v, GLIDE) : v);
		const s = stepOf(v);
		if (s !== step.get()) {
			step.set(s);
			scheduleOnRN(fireStep, s);
		}
		const e = v <= 0 ? -1 : v >= 1 ? 1 : 0;
		if (e !== 0 && e !== edge.get()) {
			scheduleOnRN(fireEdge);
		}
		edge.set(e);
		return v;
	};

	const pan = usePanGesture({
		activeOffsetX: [-SLIDER.activeX, SLIDER.activeX],
		failOffsetY: [-SLIDER.failY, SLIDER.failY],
		onActivate: (e) => {
			move(e.x, false);
		},
		onBegin: () => {
			grab.set(1);
			// The face follows from this frame on, and the thumb's nudge never plays again.
			touched.set(1);
			driving.set(1);
			scheduleOnRN(fireTouch);
		},
		onDeactivate: () => {
			scheduleOnRN(fireRelease, pos.get());
		},
		onFinalize: () => {
			grab.set(0);
		},
		onUpdate: (e) => {
			move(e.x, false);
		},
	});
	const tap = useTapGesture({
		onActivate: (e) => {
			touched.set(1);
			driving.set(1);
			const v = move(e.x, true);
			scheduleOnRN(fireRelease, v);
		},
	});
	const gesture = useExclusiveGestures(pan, tap);

	/** VoiceOver's increment / decrement: one step, to that step's centre, answered at once. */
	const adjust = (dir: 1 | -1, from: number | null) => {
		const s = stepBy(from, dir);
		const v = centreOf(s);
		touched.set(1);
		driving.set(1);
		pos.set(withTiming(v, GLIDE));
		step.set(s);
		ref.current.onTouch();
		ref.current.onStep(s);
		ref.current.onRelease(v);
	};

	/** Back to the middle (Not sure, a new visit); `glide` as the board's .14 s. */
	const reset = (glide: boolean) => {
		pos.set(glide ? withTiming(SAME, GLIDE) : SAME);
		step.set(0);
		edge.set(0);
	};

	/** A dev state's answer: the thumb at `v`, as a finished drag. */
	const place = (v: number) => {
		touched.set(1);
		driving.set(1);
		pos.set(withSpring(v, PLACE));
		step.set(stepOf(v));
		edge.set(0);
	};

	return { adjust, gesture, grab, listen, place, pos, reset, width };
}

export type MoodSlider = ReturnType<typeof useMoodSlider>;
