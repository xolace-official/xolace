import { useEffect, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { useWelcomeBack } from "../welcome-back-data";
import { GreetingList } from "./greeting-list";
import { PromptPage } from "./prompt-page";

/**
 * Board `.gs` / `.pgl` / `.pgp`: the card sizes to its list and grows to 648 on the prompt page
 * (420 ms); the list slides −30% and fades as the page slides in from +40% (360 ms, fades
 * 280 ms). Past 80% of the screen (large Dynamic Type) the card stops growing and scrolls.
 */
const PAGE_H = 648;
const MAX_FRACTION = 0.8;
const EASE = Easing.bezier(0.2, 0.85, 0.25, 1);
const T = {
	fade: 280,
	height: 420,
	listOut: -0.3,
	pageIn: 0.4,
	slide: 360,
} as const;
/** The sheet sits 10 in from each side (`DetachedSheet`'s `left-2.5 right-2.5`). */
const SIDE = 10;

/** The card's two pages, inside `DetachedSheet`'s surface (radius 42). */
export function GreetingCard() {
	const { state } = useWelcomeBack();
	const { page, reduced } = state;
	const { width, height } = useWindowDimensions();
	const [listH, setListH] = useState(0);
	const maxH = height * MAX_FRACTION;
	const cardW = width - SIDE * 2;
	const onPrompt = page === "prompt";

	const h = useSharedValue(0);
	const slide = useSharedValue(onPrompt ? 1 : 0);
	const fade = useSharedValue(onPrompt ? 1 : 0);

	const target = Math.min(onPrompt ? PAGE_H : listH, maxH);
	useEffect(() => {
		if (!target) {
			return;
		}
		const first = h.get() === 0;
		h.set(
			first
				? target
				: withTiming(target, {
						duration: reduced ? REDUCED_FADE_MS : T.height,
						easing: EASE,
						...PLAY_AS_CHOSEN,
					})
		);
	}, [target, reduced, h]);
	useEffect(() => {
		const to = onPrompt ? 1 : 0;
		slide.set(
			reduced
				? to
				: withTiming(to, { duration: T.slide, easing: EASE, ...PLAY_AS_CHOSEN })
		);
		fade.set(withTiming(to, { duration: T.fade, ...PLAY_AS_CHOSEN }));
	}, [onPrompt, reduced, slide, fade]);

	const card = useAnimatedStyle(() => ({ height: h.get() || undefined }));
	const listStyle = useAnimatedStyle(() => ({
		opacity: 1 - fade.get(),
		transform: [{ translateX: T.listOut * cardW * slide.get() }],
	}));
	const pageStyle = useAnimatedStyle(() => ({
		opacity: fade.get(),
		transform: [{ translateX: T.pageIn * cardW * (1 - slide.get()) }],
	}));

	return (
		<Animated.View
			className="z-1 overflow-hidden rounded-[42px] border-continuous bg-surface"
			style={card}
		>
			<Animated.View
				accessibilityElementsHidden={onPrompt}
				className="absolute inset-0"
				importantForAccessibility={onPrompt ? "no-hide-descendants" : "auto"}
				pointerEvents={onPrompt ? "none" : "auto"}
				style={listStyle}
			>
				<ScrollView
					contentContainerClassName="grow justify-end"
					scrollEnabled={listH > maxH}
					showsVerticalScrollIndicator={false}
				>
					<View
						onLayout={(e) => setListH(Math.ceil(e.nativeEvent.layout.height))}
					>
						<GreetingList />
					</View>
				</ScrollView>
			</Animated.View>
			<Animated.View
				accessibilityElementsHidden={!onPrompt}
				className="absolute inset-0"
				importantForAccessibility={onPrompt ? "auto" : "no-hide-descendants"}
				pointerEvents={onPrompt ? "auto" : "none"}
				style={pageStyle}
			>
				<ScrollView
					contentContainerClassName="grow"
					showsVerticalScrollIndicator={false}
				>
					<PromptPage />
				</ScrollView>
			</Animated.View>
		</Animated.View>
	);
}
