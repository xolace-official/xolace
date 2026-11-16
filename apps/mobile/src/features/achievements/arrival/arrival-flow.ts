import { useEffect, useRef, useState } from "react";
import {
	AccessibilityInfo,
	findNodeHandle,
	type TextInstance,
	type ViewInstance,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { scheduleOnUI } from "react-native-worklets";
import {
	playArrivalHaptic,
	useArrivalClock,
} from "@/features/achievements/arrival/arrival-clock";
import {
	age,
	type Eng,
	EV,
	PH,
} from "@/features/achievements/arrival/arrival-motion";
import {
	type Still,
	startEng,
	toBadges,
	toClose,
	toNextBadge,
} from "@/features/achievements/arrival/arrival-start";
import { playAffirmativePress, playSoftPress } from "@/lib/haptics";

const FOCUS_MS = 60;
/** The host fades the arrival in over 350 ms; its Skia canvases mount once it's in. */
const SHOWN_AFTER_MS = 360;

/** VoiceOver focus on a heading as it comes out. */
const focus = (node: ViewInstance | TextInstance | null | undefined) =>
	setTimeout(() => {
		const tag = node ? findNodeHandle(node) : null;
		if (tag) {
			AccessibilityInfo.setAccessibilityFocus(tag);
		}
	}, FOCUS_MS);

/**
 * The arrival's flow: the engine and its clock, the phase (milestone, then
 * badges), and what start, Next / Lovely and the close do. Every change goes to
 * the engine on the UI thread; React hears only the phase and the step.
 */
export function useArrivalFlow({
	total,
	hasMilestone,
	reduced,
	still,
	onDone,
}: {
	total: number;
	hasMilestone: boolean;
	reduced: boolean;
	still?: Still;
	onDone: () => void;
}) {
	const [first] = useState(() => startEng(hasMilestone, reduced, still));
	const eng = useSharedValue(first);
	const fa = useSharedValue(Math.max(0, age(first, first.ta)));
	const [phase, setPhase] = useState<number>(first.phase);
	const step = useRef(first.step);
	const titles = useRef<(TextInstance | null)[]>([]);
	const msRef = useRef<ViewInstance>(null);
	const [shown, setShown] = useState(0);

	const onEvent = (ev: number) => {
		if (ev === EV.close) {
			onDone();
		} else if (ev === EV.idle) {
			clock.setActive(false);
		} else {
			playArrivalHaptic(ev);
		}
	};
	const clock = useArrivalClock({ eng, fa, onEvent });
	useEffect(() => () => clock.setActive(false), [clock]);

	/** The clock runs until nothing moves; a touch, Next or a close starts it again. */
	const wake = () => {
		if (!still) {
			clock.setActive(true);
		}
	};
	/** Changes the engine on the UI thread, where the clock reads it. */
	const act = (change: (e: Eng) => void) =>
		scheduleOnUI(() => {
			"worklet";
			eng.modify((e) => {
				"worklet";
				change(e);
				return e;
			});
		});

	/** A staged arrival opens: a fresh engine and the clock. A held frame stays as it is. */
	const start = () => {
		setTimeout(() => setShown((n) => n + 1), SHOWN_AFTER_MS);
		if (still) {
			return;
		}
		const e = startEng(hasMilestone, reduced);
		step.current = e.step;
		eng.set(e);
		fa.set(0);
		setPhase(e.phase);
		clock.setActive(true);
		focus(hasMilestone ? msRef.current : titles.current[0]);
	};

	const close = () => {
		act(toClose);
		wake();
		if (still) {
			onDone();
		}
	};

	const next = () => {
		if (phase === PH.ms) {
			playSoftPress();
			act(toBadges);
			setPhase(PH.badge);
		} else if (step.current < total - 1) {
			playSoftPress();
			step.current += 1;
			act(toNextBadge);
		} else {
			playAffirmativePress();
			close();
			return;
		}
		wake();
		focus(titles.current[step.current]);
	};

	const titleRef = (i: number) => (node: TextInstance | null) => {
		titles.current[i] = node;
	};

	return {
		close,
		eng,
		fa,
		first,
		msRef,
		next,
		phase,
		shown,
		start,
		titleRef,
		wake,
	};
}
