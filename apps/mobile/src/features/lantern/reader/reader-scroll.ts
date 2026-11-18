/** The reader's scroll moments that touch React: each fires once, when its value flips. */
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

/** Every scroll moment the reader has, on its layout: open, keep, leave, reach the end. */
export function useScrollMoments(n: {
	/** The stored place to open on; null stays at the top. */
	opensAt: number | null;
	/** Dev states only. */
	startAt: number | undefined;
	endAt: number;
	y: SharedValue<number>;
	maxScroll: number;
	scroll: Scroll;
}) {
	const { state, actions } = useReaderScreen();
	// Clear and By the fire set their own faces: the page's layout isn't final until they're in.
	const { mode, size } = state.prefs;
	const fontsReady = useReadingFonts() || READING_MODES[mode].face === null;
	useOpenAt(n.opensAt, fontsReady, n.maxScroll, n.scroll);
	useStartAt(n.startAt, n.maxScroll, n.scroll);
	useKeepPlace(`${mode}:${size}:${fontsReady}`, n.y, n.maxScroll, n.scroll);
	useLeaveAt(n.y, n.maxScroll, actions.leaveAt);
	useReachEnd(n.y, n.endAt, actions.reachEnd);
}

/** Opening on a stored place (production's resume): once, as soon as the place, the reading
 * fonts and the layout are all in (the fonts arriving reflow the text). `share` null stays at
 * the top. */
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

/** Dev states only: open at a fixed offset (a frozen frame), measured from the end when
 * negative, once the layout has settled (the body measures after the first layout). */
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

/** How long a reflow has to report its new height before its share is dropped. */
const REFLOW_MS = 300;

/**
 * New in v2: keep your place when the text reflows (`placeKeeper`). `layout` names what sets it:
 * the mode, the size and whether the reading fonts are in.
 */
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
	// The new height arrives as maxScroll changes.
	useEffect(() => {
		const to = keeper.sized(maxScroll);
		if (to !== null) {
			scroll.current?.scrollTo({ animated: false, y: to });
		}
	}, [maxScroll, scroll, keeper]);
}

/** Leaving keeps the place, once the reader has moved; past the ceiling there's nothing to pick
 * up. Going to the background keeps it too, so an app killed there doesn't lose it. The refs
 * keep both on the latest layout. */
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

/** Tells the data hook when the end is first reached. */
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
