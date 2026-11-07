import { useEffect, useRef } from "react";
import {
	GAZE_AHEAD,
	GAZE_AT_YOU,
	gazeAtWriting,
	leanPose,
	leanSteps,
	type Writing,
} from "@/features/reflect/compose/compose-face-gaze";
import { NEUTRAL } from "@/features/xolace-face/pose";
import { useFace } from "@/features/xolace-face/use-face";

/** How long a pause in the writing before it looks up at you. */
const PAUSE_MS = 1400;

/**
 * The composer's Xolace face: it leans in as you write more and its eyes follow the end of
 * your last line (reported by `LineEndMeter`). Resting until the composer opens.
 */
export function useComposeFace(expanded: boolean, text: string) {
	const face = useFace(NEUTRAL, expanded);
	const pause = useRef<ReturnType<typeof setTimeout>>(undefined);
	const steps = expanded && text.length > 0 ? leanSteps(text.length) : null;

	useEffect(() => {
		face.to(steps === null ? NEUTRAL : leanPose(steps));
	}, [face, steps]);

	useEffect(() => {
		if (expanded) {
			return;
		}
		clearTimeout(pause.current);
		face.look(GAZE_AHEAD.x, GAZE_AHEAD.y);
	}, [expanded, face]);

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
