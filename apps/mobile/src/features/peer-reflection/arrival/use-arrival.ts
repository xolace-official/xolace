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
	onLand: (count: number) => void;
	onUi: () => void;
	onRead: () => void;
};

type Args = {
	ready: boolean;
	n: number;
	words: number;
	hold?: number;
	events: Events;
};

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
