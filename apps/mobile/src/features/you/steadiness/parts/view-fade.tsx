import { type ReactNode, useEffect } from "react";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const FADE_MS = 180;
const PAGE_GUTTER = 20;
const HIDDEN = {
	left: PAGE_GUTTER,
	position: "absolute",
	right: PAGE_GUTTER,
	top: 0,
} as const;

export function ViewFade({
	active,
	children,
}: {
	active: boolean;
	children: ReactNode;
}) {
	const reduced = useEffectiveReducedMotion();
	const o = useSharedValue(active ? 1 : 0);
	useEffect(() => {
		o.set(
			active && !reduced
				? withTiming(1, {
						duration: FADE_MS,
						easing: Easing.linear,
						...PLAY_AS_CHOSEN,
					})
				: active
					? 1
					: 0
		);
	}, [active, reduced, o]);
	const style = useAnimatedStyle(() => ({ opacity: o.get() }));
	return (
		<Animated.View
			accessibilityElementsHidden={!active}
			importantForAccessibility={active ? "auto" : "no-hide-descendants"}
			pointerEvents={active ? "auto" : "none"}
			style={[active ? null : HIDDEN, style]}
		>
			{children}
		</Animated.View>
	);
}
