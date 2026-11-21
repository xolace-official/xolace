import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
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
	// No scroll event fires on mount: it starts at minus the header's height.
	const scrollY = useSharedValue(-headerH);
	const onScroll = useAnimatedScrollHandler((e) => {
		scrollY.set(e.contentOffset.y);
	});
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
	// Stops sit at distinct heights, so a new open stop always moves `openY`.
	const stop = stops[open];
	const openY = stop && trailTop ? trailTop + stop[1] : null;
	const reveal = useEffectEvent((y: number, max: number, animated: boolean) => {
		const seen = y - scrollY.get();
		if (seen < VIEW_MIN) {
			scrollToY(y - VIEW_MIN, animated);
		} else if (seen > max) {
			scrollToY(y - max, animated);
		}
	});
	useEffect(() => {
		if (openY !== null) {
			reveal(openY, viewMax, !reduced);
		}
	}, [openY, reduced, viewMax]);

	// The first scroll to the fire, once the trail and card are measured, jumps; later ones glide.
	const arrived = useRef(false);
	useEffect(() => {
		if (!(trailTop && cardH)) {
			return;
		}
		const first = !arrived.current;
		arrived.current = true;
		if (!caught) {
			return;
		}
		const animated = !(first || reduced);
		const id = setTimeout(() => scroll.current?.scrollToEnd({ animated }), 0);
		return () => clearTimeout(id);
	}, [caught, cardH, reduced, scroll, trailTop]);

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
