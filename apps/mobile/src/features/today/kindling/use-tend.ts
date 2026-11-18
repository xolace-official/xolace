import { useIsFocused } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Presets } from "react-native-pulsar";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { tap } from "@/lib/haptics";
import {
	BEAT,
	firstWaiting,
	newlyTended,
	syncTend,
	TEND,
	type TwigView,
	tendAt,
	tendedCount,
	tendStart,
	tendWait,
} from "./kindling-model";

type States = TwigView["state"][];
type Timer = ReturnType<typeof setTimeout>;

const clearAll = (timers: Timer[]) => {
	for (const id of timers) {
		clearTimeout(id);
	}
};

/**
 * The path as Today shows it, trailing the server (`syncTend`): a step tended on another
 * screen celebrates here once, when Today is in front (the card's own choreography, on its
 * leg). Anything else (a step passed by, a new kindling) follows at once. Everything on the
 * path derives from one clock, `beat` (ms since the step was tended).
 */
export function useTend(kindlingId: string, now: States, reduced: boolean) {
	const focused = useIsFocused();
	const [tend, setTend] = useState(() => tendStart(kindlingId, now));
	const [count, setCount] = useState(() => tendedCount(now));
	const [justDone, setJustDone] = useState(-1);
	const [tendN, setTendN] = useState(0);
	/** The NEXT row's step blurs in as the light arrives, until the next peek. */
	const [fresh, setFresh] = useState(false);
	const [peek, setPeek] = useState(-1);
	const [peekN, setPeekN] = useState(0);
	const [resetN, setResetN] = useState(0);
	const beat = useSharedValue<number>(BEAT.end);
	const peekTimer = useRef<Timer[]>([]);
	// The choreography outlives the effect run that starts it (setting `shown` re-runs the effect).
	const choreo = useRef<Timer[]>([]);
	const busyUntil = useRef(0);

	const sync = syncTend(tend, kindlingId, now);
	if (sync) {
		setTend(sync.next);
		if (sync.changed) {
			setCount(tendedCount(sync.next.shown));
		}
		if (sync.reset) {
			setJustDone(-1);
			setFresh(false);
			setPeek(-1);
			setResetN((n) => n + 1);
		}
	}
	// A new path: whatever was playing for the old one stops.
	useEffect(() => {
		if (resetN === 0) {
			return;
		}
		clearAll(choreo.current);
		clearAll(peekTimer.current);
		busyUntil.current = 0;
		beat.set(BEAT.end);
	}, [beat, resetN]);

	const { shown } = tend;
	const i = newlyTended(shown, now);
	useEffect(() => {
		if (!focused || i < 0) {
			return;
		}
		const settle = setTimeout(
			() => {
				const next = tendAt(shown, i);
				setTend((t) => ({ ...t, shown: next }));
				if (reduced) {
					setCount(tendedCount(next));
					return;
				}
				busyUntil.current = Date.now() + BEAT.end;
				setJustDone(i);
				setTendN((n) => n + 1);
				setFresh(true);
				setPeek(-1);
				tap();
				beat.set(0);
				beat.set(
					withTiming(BEAT.end, {
						duration: BEAT.end,
						easing: Easing.linear,
						...PLAY_AS_CHOSEN,
					})
				);
				clearAll(choreo.current);
				choreo.current = [
					setTimeout(() => setCount(tendedCount(next)), BEAT.countAt),
					setTimeout(() => setJustDone(-1), BEAT.end),
				];
				if (firstWaiting(next) === i + 1) {
					choreo.current.push(
						setTimeout(() => Presets.System.selection(), BEAT.arriveAt)
					);
				}
			},
			tendWait(Date.now(), busyUntil.current, reduced)
		);
		return () => clearTimeout(settle);
	}, [beat, focused, i, reduced, shown]);

	useEffect(
		() => () => {
			clearAll(peekTimer.current);
			clearAll(choreo.current);
		},
		[]
	);

	const waiting = firstWaiting(shown);
	const current = waiting < 0 ? shown.length : waiting;

	/** Tap a node: its step shows in the NEXT row for a moment. */
	const peekAt = (j: number) => {
		if (j === current) {
			return;
		}
		Presets.System.selection();
		clearAll(peekTimer.current);
		setPeek(j);
		setPeekN((n) => n + 1);
		setFresh(false);
		peekTimer.current = [setTimeout(() => setPeek(-1), TEND.peekMs)];
	};

	return {
		beat,
		count,
		current,
		fresh,
		justDone,
		peek,
		peekAt,
		peekN,
		shown,
		tendN,
	};
}
