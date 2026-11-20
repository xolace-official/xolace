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
import { useLater } from "@/lib/use-later";

const FOCUS_MS = 60;
const SHOWN_AFTER_MS = 360;

const focusNow = (node: ViewInstance | TextInstance | null | undefined) => {
	const tag = node ? findNodeHandle(node) : null;
	if (tag) {
		AccessibilityInfo.setAccessibilityFocus(tag);
	}
};

export function useArrivalFlow({
	total,
	hasMilestone,
	reduced,
	still,
	silent,
	onDone,
}: {
	total: number;
	hasMilestone: boolean;
	reduced: boolean;
	still?: Still;
	silent: readonly number[];
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
	const later = useLater();
	const focus = (node: ViewInstance | TextInstance | null | undefined) =>
		later(() => focusNow(node), FOCUS_MS);

	const onEvent = (ev: number) => {
		if (ev === EV.close) {
			onDone();
		} else if (ev === EV.idle) {
			clock.setActive(false);
		} else if (!silent.includes(ev)) {
			playArrivalHaptic(ev);
		}
	};
	const clock = useArrivalClock({ eng, fa, onEvent });
	useEffect(() => () => clock.setActive(false), [clock]);

	const wake = () => {
		if (!still) {
			clock.setActive(true);
		}
	};
	const act = (change: (e: Eng) => void) =>
		scheduleOnUI(() => {
			"worklet";
			eng.modify((e) => {
				"worklet";
				change(e);
				return e;
			});
		});

	const start = () => {
		later(() => setShown((n) => n + 1), SHOWN_AFTER_MS);
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
