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
	type TwigView,
	tendedCount,
} from "./kindling-model";

/** Let Today land before a tended step celebrates. */
const SETTLE_MS = 450;
const PEEK_MS = 2600;
/** A second tend waits for the first one's choreography to finish. */
const NEXT_GAP_MS = 100;

type States = TwigView["state"][];

/**
 * The path as Today shows it, trailing the server: a step tended on another screen
 * celebrates here once, when Today is in front (the card's own choreography, on its leg).
 * Anything else (a step passed by, a new kindling) follows at once. Everything on the path
 * derives from one clock, `beat` (ms since the step was tended).
 */
export function useTend(kindlingId: string, now: States, reduced: boolean) {
	const focused = useIsFocused();
	const [shown, setShown] = useState<States>(now);
	const [count, setCount] = useState(() => tendedCount(now));
	const [justDone, setJustDone] = useState(-1);
	const [tendN, setTendN] = useState(0);
	const [peek, setPeek] = useState(-1);
	const [peekN, setPeekN] = useState(0);
	const beat = useSharedValue<number>(BEAT.end);
	const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	// The choreography outlives the effect run that starts it (setting `shown` re-runs the effect).
	const choreo = useRef<ReturnType<typeof setTimeout>[]>([]);
	const busyUntil = useRef(0);

	// A new kindling, or a change that isn't a fresh tend, shows at once.
	const nowKey = `${kindlingId}:${now.join(",")}`;
	const [seen, setSeen] = useState({ id: kindlingId, key: nowKey });
	if (seen.key !== nowKey) {
		setSeen({ id: kindlingId, key: nowKey });
		const synced =
			seen.id === kindlingId
				? shown.map((s, i) =>
						now[i] === "done" && s !== "done" ? s : (now[i] ?? s)
					)
				: now;
		if (
			synced.some((s, i) => s !== shown[i]) ||
			synced.length !== shown.length
		) {
			setShown(synced);
			setCount(tendedCount(synced));
		}
	}

	const i = newlyTended(shown, now);
	useEffect(() => {
		if (!focused || i < 0) {
			return;
		}
		const wait = Math.max(
			SETTLE_MS,
			busyUntil.current - Date.now() + NEXT_GAP_MS
		);
		const settle = setTimeout(
			() => {
				const next = shown.map((s, j) => (j === i ? "done" : s));
				setShown(next);
				if (reduced) {
					setCount(tendedCount(next));
					return;
				}
				busyUntil.current = Date.now() + BEAT.end;
				setJustDone(i);
				setTendN((n) => n + 1);
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
				for (const id of choreo.current) {
					clearTimeout(id);
				}
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
			reduced ? 0 : wait
		);
		return () => clearTimeout(settle);
	}, [beat, focused, i, reduced, shown]);

	useEffect(
		() => () => {
			if (peekTimer.current) {
				clearTimeout(peekTimer.current);
			}
			for (const id of choreo.current) {
				clearTimeout(id);
			}
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
		if (peekTimer.current) {
			clearTimeout(peekTimer.current);
		}
		setPeek(j);
		setPeekN((n) => n + 1);
		peekTimer.current = setTimeout(() => setPeek(-1), PEEK_MS);
	};

	return { beat, count, current, justDone, peek, peekAt, peekN, shown, tendN };
}
