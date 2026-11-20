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

const VIEW_MIN = 150;
const VIEW_MAX = 540;

type Args = {
	stops: readonly Pt[];
	open: number;
	caught: boolean;
	reduced: boolean;
	bottom: number;
	cardH: number;
};

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
