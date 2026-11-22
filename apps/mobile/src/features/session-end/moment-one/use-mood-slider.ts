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

const GLIDE = {
	duration: SLIDER.glideMs,
	easing: EASE.glide,
	...PLAY_AS_CHOSEN,
};
const PLACE = { dampingRatio: 1, duration: 300, ...PLAY_AS_CHOSEN };

export type SliderHandlers = {
	onTouch: () => void;
	onStep: (step: number) => void;
	onEdge: () => void;
	onRelease: (position: number) => void;
};

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
	const ref = useRef(IGNORE);
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

	const reset = (glide: boolean) => {
		pos.set(glide ? withTiming(SAME, GLIDE) : SAME);
		step.set(0);
		edge.set(0);
	};

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
