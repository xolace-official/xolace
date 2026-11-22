import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type Animated from "react-native-reanimated";
import {
	type AnimatedRef,
	type SharedValue,
	useAnimatedReaction,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useReaderScreen } from "@/features/lantern/reader/reader-data";
import {
	leaveShare,
	placeKeeper,
} from "@/features/lantern/reader/reader-model";
import {
	READING_MODES,
	useReadingFonts,
} from "@/features/lantern/reader/reading-modes";

type Scroll = AnimatedRef<Animated.ScrollView>;

export function useScrollMoments(n: {
	opensAt: number | null;
	startAt: number | undefined;
	endAt: number;
	y: SharedValue<number>;
	maxScroll: number;
	scroll: Scroll;
}) {
	const { state, actions } = useReaderScreen();
	const { mode, size } = state.prefs;
	const fontsReady = useReadingFonts() || READING_MODES[mode].face === null;
	useOpenAt(n.opensAt, fontsReady, n.maxScroll, n.scroll);
	useStartAt(n.startAt, n.maxScroll, n.scroll);
	useKeepPlace(`${mode}:${size}:${fontsReady}`, n.y, n.maxScroll, n.scroll);
	useLeaveAt(n.y, n.maxScroll, actions.leaveAt);
	useReachEnd(n.y, n.endAt, actions.reachEnd);
}

function useOpenAt(
	share: number | null,
	fontsReady: boolean,
	maxScroll: number,
	scroll: Scroll
) {
	const done = useRef(false);
	useEffect(() => {
		if (done.current || share === null || !fontsReady || maxScroll <= 0) {
			return;
		}
		done.current = true;
		scroll.current?.scrollTo({ animated: false, y: share * maxScroll });
	}, [share, fontsReady, maxScroll, scroll]);
}

const SETTLE_MS = 450;
function useStartAt(at: number | undefined, maxScroll: number, scroll: Scroll) {
	const done = useRef(false);
	useEffect(() => {
		if (done.current || at === undefined || maxScroll <= 0) {
			return;
		}
		const t = setTimeout(() => {
			done.current = true;
			scroll.current?.scrollTo({
				animated: false,
				y: at < 0 ? Math.max(0, maxScroll + at) : Math.min(at, maxScroll),
			});
		}, SETTLE_MS);
		return () => clearTimeout(t);
	}, [at, maxScroll, scroll]);
}

const REFLOW_MS = 300;

function useKeepPlace(
	layout: string,
	y: SharedValue<number>,
	maxScroll: number,
	scroll: Scroll
) {
	const was = useRef(layout);
	const [keeper] = useState(placeKeeper);
	useLayoutEffect(() => {
		if (was.current === layout) {
			return;
		}
		was.current = layout;
		keeper.arm(y.get(), maxScroll);
		const t = setTimeout(keeper.settle, REFLOW_MS);
		return () => clearTimeout(t);
	}, [layout, maxScroll, y, keeper]);
	useEffect(() => {
		const to = keeper.sized(maxScroll);
		if (to !== null) {
			scroll.current?.scrollTo({ animated: false, y: to });
		}
	}, [maxScroll, scroll, keeper]);
}

function useLeaveAt(
	y: SharedValue<number>,
	maxScroll: number,
	leaveAt: (share: number | null) => void
) {
	const max = useRef(maxScroll);
	const leave = useRef(leaveAt);
	useEffect(() => {
		max.current = maxScroll;
		leave.current = leaveAt;
	});
	useEffect(() => {
		const keep = () => leave.current(leaveShare(y.get(), max.current));
		const sub = AppState.addEventListener("change", (next) => {
			if (next === "background") {
				keep();
			}
		});
		return () => {
			sub.remove();
			keep();
		};
	}, [y]);
}

function useReachEnd(
	y: SharedValue<number>,
	endAt: number,
	reachEnd: () => void
) {
	useAnimatedReaction(
		() => y.get() >= endAt,
		(now, was) => {
			if (now && !was) {
				scheduleOnRN(reachEnd);
			}
		}
	);
}
