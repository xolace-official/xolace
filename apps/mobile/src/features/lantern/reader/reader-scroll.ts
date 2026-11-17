/** The reader's scroll moments that touch React: each fires once, when its value flips. */
import { useEffect, useLayoutEffect, useRef } from "react";
import type Animated from "react-native-reanimated";
import {
	type AnimatedRef,
	type SharedValue,
	useAnimatedReaction,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { leaveShare } from "@/features/lantern/reader/reader-model";

type Scroll = AnimatedRef<Animated.ScrollView>;

/** Opening on a stored place (production's resume): once, as soon as the place and the layout
 * are both in. `share` null stays at the top. */
export function useOpenAt(
	share: number | null,
	maxScroll: number,
	scroll: Scroll
) {
	const done = useRef(false);
	useEffect(() => {
		if (done.current || share === null || maxScroll <= 0) {
			return;
		}
		done.current = true;
		scroll.current?.scrollTo({ animated: false, y: share * maxScroll });
	}, [share, maxScroll, scroll]);
}

/** Dev states only: open at a fixed offset (a frozen frame), measured from the end when
 * negative, once the layout has settled (the body measures after the first layout). */
const SETTLE_MS = 450;
export function useStartAt(
	at: number | undefined,
	maxScroll: number,
	scroll: Scroll
) {
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

/**
 * New in v2: keep your place when the text reflows. A mode or size change takes the read share
 * before the new layout; the next content size scrolls to the same share, without animating.
 */
export function useKeepPlace(
	mode: string,
	size: number,
	y: SharedValue<number>,
	maxScroll: number,
	scroll: Scroll
) {
	const was = useRef({ mode, size });
	const share = useRef<number | null>(null);
	useLayoutEffect(() => {
		if (was.current.mode === mode && was.current.size === size) {
			return;
		}
		was.current = { mode, size };
		if (maxScroll > 0) {
			share.current = Math.min(1, Math.max(0, y.get() / maxScroll));
		}
	}, [mode, size, maxScroll, y]);
	// The new height arrives as maxScroll changes.
	useEffect(() => {
		if (share.current === null) {
			return;
		}
		const to = share.current * maxScroll;
		share.current = null;
		scroll.current?.scrollTo({ animated: false, y: to });
	}, [maxScroll, scroll]);
}

/** Leaving keeps the place, once the reader has moved; past the ceiling there's nothing to pick
 * up. The ref keeps the cleanup on the latest layout. */
export function useLeaveAt(
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
	useEffect(() => () => leave.current(leaveShare(y.get(), max.current)), [y]);
}

/** Tells the data hook when the end is first reached. */
export function useReachEnd(
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
