import { useEffect, useRef } from "react";
import { withSpring } from "react-native-reanimated";
import { NEUTRAL, type Pose, PRESETS } from "@/components/xolace-face/pose";
import { useFace } from "@/components/xolace-face/use-face";
import {
	GAZE_AT_YOU,
	gazeAtWriting,
	leanPose,
	leanSteps,
	type Writing,
} from "./compose-face-gaze";

/** How long a pause in the writing before it looks up at you. */
const PAUSE_MS = 1400;
/** Late, its eyes are a little heavier (board: `eo × .9`). */
const LATE_EYES = 0.9;
/** No live voice level reaches the screen: while listening, the `listen` dial rests here. */
const LISTEN_REST = 0.5;
const LISTEN_SPRING = { damping: 20, stiffness: 180 };

/**
 * The writing face: it leans in as you write more and its eyes follow the end of your last line
 * (reported by `LineEndMeter`), then look up at you after a pause. Holding the mic turns it
 * `attentive` with its `listen` dial up; late, its eyes are a little heavier.
 */
export function useComposeFace(
	running: boolean,
	text: string,
	listening: boolean,
	late: boolean
) {
	const face = useFace(NEUTRAL, running);
	const pause = useRef<ReturnType<typeof setTimeout>>(undefined);
	const steps = text.length > 0 ? leanSteps(text.length) : null;

	useEffect(() => {
		let base: Pose = NEUTRAL;
		if (listening) {
			base = PRESETS.attentive;
		} else if (steps !== null) {
			base = leanPose(steps);
		}
		face.to(
			late && !listening ? { ...base, eyeOpen: base.eyeOpen * LATE_EYES } : base
		);
	}, [face, steps, listening, late]);

	useEffect(() => {
		face.listen.set(withSpring(listening ? LISTEN_REST : 0, LISTEN_SPRING));
	}, [face, listening]);

	useEffect(() => () => clearTimeout(pause.current), []);

	const onWriting = (writing: Writing) => {
		clearTimeout(pause.current);
		const gaze = gazeAtWriting(writing);
		face.look(gaze.x, gaze.y);
		if (writing.text.length === 0) {
			return;
		}
		pause.current = setTimeout(() => {
			face.look(GAZE_AT_YOU.x, GAZE_AT_YOU.y);
		}, PAUSE_MS);
	};

	return { face, onWriting };
}
