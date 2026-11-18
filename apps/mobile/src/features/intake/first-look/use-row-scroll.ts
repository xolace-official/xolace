// Scrolling the middle to a row as it opens. The content is still growing while it scrolls,
// so the scroll follows a timing on the UI thread (a plain animated scrollTo would stop at the
// content's old end).
import { useRef } from "react";
import type { LayoutChangeEvent } from "react-native";
import type Animated from "react-native-reanimated";
import {
	scrollTo,
	useAnimatedReaction,
	useAnimatedRef,
	useAnimatedScrollHandler,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { FIRST_LOOK, type RowId } from "./copy";
import { scrollTargetFor } from "./first-look-model";
import { MOVE_EASE, OPEN_MS, SCROLL_AFTER_MS } from "./first-look-motion";

const IDLE = -1;

export function useRowScroll(reduced: boolean) {
	const ref = useAnimatedRef<Animated.ScrollView>();
	const scrollY = useSharedValue(0);
	const follow = useSharedValue(IDLE);
	const contentH = useRef(0);
	const viewH = useRef(0);
	// Each open preview's laid-out height; the board's until it has laid out.
	const heights = useRef(new Map<RowId, number>());

	const onScroll = useAnimatedScrollHandler((e) => {
		scrollY.set(e.contentOffset.y);
	});
	useAnimatedReaction(
		() => follow.get(),
		(y) => {
			if (y >= 0) {
				scrollTo(ref, 0, y, false);
			}
		}
	);

	const heightOf = (id: RowId | null) =>
		id === null
			? 0
			: (heights.current.get(id) ??
				FIRST_LOOK.rows.find((r) => r.id === id)?.height ??
				0);

	/** `next` opened as `prev` closed. */
	const toRow = (next: RowId, prev: RowId | null) => {
		const target = scrollTargetFor({
			contentH: contentH.current,
			next,
			nextH: heightOf(next),
			prevH: heightOf(prev),
			viewH: viewH.current,
		});
		if (target === null) {
			return;
		}
		if (reduced) {
			follow.set(target);
			follow.set(IDLE);
			return;
		}
		follow.set(scrollY.get());
		follow.set(
			withTiming(
				target,
				{
					duration: OPEN_MS - SCROLL_AFTER_MS,
					easing: MOVE_EASE,
					...PLAY_AS_CHOSEN,
				},
				() => follow.set(IDLE)
			)
		);
	};

	return {
		onContentSizeChange: (_w: number, h: number) => {
			contentH.current = h;
		},
		onHeight: (id: RowId, h: number) => heights.current.set(id, h),
		onLayout: (e: LayoutChangeEvent) => {
			viewH.current = e.nativeEvent.layout.height;
		},
		onScroll,
		ref,
		scrollY,
		toRow,
	};
}
