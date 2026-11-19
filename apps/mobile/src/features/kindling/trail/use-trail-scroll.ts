import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect, useRef, useState } from "react";
import { type LayoutChangeEvent, useWindowDimensions } from "react-native";
import type Animated from "react-native-reanimated";
import {
	useAnimatedRef,
	useAnimatedScrollHandler,
	useSharedValue,
} from "react-native-reanimated";
import { CIRCLE, type Pt } from "./trail-points";

/** Keep the open stop between 150 and 540 pt from the top (§2.2). */
const VIEW_MIN = 150;
const VIEW_MAX = 540;

type Args = {
	stops: readonly Pt[];
	open: number;
	/** The fire has caught: bring it up above the card. */
	caught: boolean;
	reduced: boolean;
	/** The card's bottom inset and height: the open stop stays clear of it. */
	bottom: number;
	cardH: number;
};

/**
 * The trail's scroll (§2.2): the open stop eases into view, clear of the card, and once the fire
 * catches the trail scrolls to it. Offsets are raw `contentOffset`, which starts negative under
 * the large title (automatic insets), so a point's screen y is its content y minus the offset.
 */
export function useTrailScroll({
	stops,
	open,
	caught,
	reduced,
	bottom,
	cardH,
}: Args) {
	const { height } = useWindowDimensions();
	const scroll = useAnimatedRef<Animated.ScrollView>();
	const headerH = useHeaderHeight();
	const scrollY = useSharedValue(Number.NaN);
	const onScroll = useAnimatedScrollHandler((e) => {
		scrollY.set(e.contentOffset.y);
	});
	// No scroll event fires on mount: it starts at minus the header's height.
	useEffect(() => {
		if (Number.isNaN(scrollY.get())) {
			scrollY.set(-headerH);
		}
	}, [headerH, scrollY]);
	const [trailTop, setTrailTop] = useState(0);
	const onTrailLayout = (e: LayoutChangeEvent) =>
		setTrailTop(e.nativeEvent.layout.y);

	// A scroll that folds the large title can land past its target (UIKit moves the offset as
	// the bar shrinks): land it once more where asked.
	const want = useRef<{ y: number; animated: boolean } | null>(null);
	const settle = () => {
		const w = want.current;
		want.current = null;
		if (w && Math.abs(scrollY.get() - w.y) > 1) {
			scroll.current?.scrollTo(w);
		}
	};
	const scrollToY = (y: number, animated: boolean) => {
		want.current = { animated, y };
		scroll.current?.scrollTo({ animated, y });
		if (!animated) {
			requestAnimationFrame(() => requestAnimationFrame(settle));
		}
	};

	const viewMax = Math.min(VIEW_MAX, height - bottom - cardH - CIRCLE);
	// scrolls when the open stop or the room for it changes, not on each scroll.
	useEffect(() => {
		const stop = stops[open];
		if (!(stop && trailTop)) {
			return;
		}
		const y = trailTop + stop[1];
		const seen = y - scrollY.get();
		if (seen < VIEW_MIN) {
			scrollToY(y - VIEW_MIN, !reduced);
		} else if (seen > viewMax) {
			scrollToY(y - viewMax, !reduced);
		}
	}, [open, reduced, trailTop, viewMax]);

	// Once the trail and the card are measured (the end moves with the card's height), so arriving
	// on a finished kindling opens with the fire in view, and a catch on screen scrolls to it.
	const arrived = useRef(false);
	useEffect(() => {
		if (!(caught && trailTop && cardH)) {
			return;
		}
		const animated = arrived.current && !reduced;
		arrived.current = true;
		const id = setTimeout(() => scroll.current?.scrollToEnd({ animated }), 0);
		return () => clearTimeout(id);
	}, [caught, cardH, reduced, scroll, trailTop]);
	useEffect(() => {
		if (trailTop && cardH) {
			arrived.current = true;
		}
	}, [cardH, trailTop]);

	return {
		onScroll,
		onTrailLayout,
		scroll,
		scrollProps: {
			onMomentumScrollEnd: settle,
			onScrollEndDrag: () => {
				want.current = null;
			},
		},
	};
}
