import { useEffect, useRef } from "react";
import {
	Easing,
	useAnimatedReaction,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { T } from "../peers-look";
import { arrivalEnd } from "./arrival-end";
import { landedAt, readAt } from "./arrival-time";

type Events = {
	/** `count` cards have landed (1 at the first, n at the last). */
	onLand: (count: number) => void;
	/** Done's moment: the first card lands (or, for None yet, the time it would have). */
	onUi: () => void;
	/** 1.5 s after the last card: the face reads along. */
	onRead: () => void;
};

type Args = {
	/** The results are in: the arrival runs (once). */
	ready: boolean;
	n: number;
	words: number;
	/** Dev states: hold the arrival at this many ms (`Infinity`: arrived). */
	hold?: number;
	events: Events;
};

/**
 * The whole arrival as one value in board ms (mailbox-inbox's single `open`):
 * the title, every card's rise, line, star and bloom are pure functions of it,
 * so they stay in step to the frame. It runs once, linearly, from when the
 * results are in. React hears only the moments that change what's on screen (a
 * card landing, Done, reading).
 */
export function useArrival({ ready, n, words, hold, events }: Args) {
	const end = arrivalEnd(words, n);
	const arrive = useSharedValue(0);
	const ev = useRef(events);
	useEffect(() => {
		ev.current = events;
	});

	useEffect(() => {
		if (!ready) {
			arrive.set(0);
			return;
		}
		if (hold !== undefined) {
			arrive.set(Math.min(hold, end));
			return;
		}
		arrive.set(0);
		arrive.set(
			withTiming(end, {
				duration: end,
				easing: Easing.linear,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [ready, hold, end, arrive]);

	const land = (c: number) => ev.current.onLand(c);
	const ui = () => ev.current.onUi();
	const read = () => ev.current.onRead();
	const readFrom = readAt(n);
	useAnimatedReaction(
		() => landedAt(arrive.get(), n),
		(c, was) => {
			if (c > 0 && c !== was) {
				scheduleOnRN(land, c);
			}
		}
	);
	useAnimatedReaction(
		() => ready && arrive.get() >= T.first,
		(on, was) => {
			if (on && !was) {
				scheduleOnRN(ui);
			}
		}
	);
	useAnimatedReaction(
		() => n > 0 && arrive.get() >= readFrom,
		(on, was) => {
			if (on && !was) {
				scheduleOnRN(read);
			}
		}
	);
	return { arrive, end };
}
