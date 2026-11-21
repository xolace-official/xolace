import { type ReactNode, useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { cn } from "@/lib/cn";
import { FADE } from "../sit-look";

type Props = {
	on: boolean;
	keep?: boolean;
	ms?: number;
	className?: string;
	style?: StyleProp<ViewStyle>;
	children: ReactNode;
};

export function Block({
	on,
	keep = false,
	ms = FADE.blockMs,
	className,
	style,
	children,
}: Props) {
	const o = useSharedValue(on ? 1 : 0);
	useEffect(() => {
		o.set(
			withTiming(on ? 1 : 0, {
				duration: ms,
				easing: Easing.ease,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [on, o, ms]);
	const fade = useAnimatedStyle(() => ({ opacity: o.get() }));
	return (
		<Animated.View
			accessibilityElementsHidden={!on}
			className={cn("absolute", className)}
			importantForAccessibility={on ? "auto" : "no-hide-descendants"}
			pointerEvents={on ? "box-none" : "none"}
			style={[style, fade]}
		>
			{on || keep ? children : null}
		</Animated.View>
	);
}
