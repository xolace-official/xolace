import { StyleSheet, View } from "react-native";
import Animated, {
	Extrapolation,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { ScopedTheme } from "uniwind";
import type { ThemeEntry } from "@/lib/themes";

const GLOW_OPACITY = 0.16;

type Props = {
	theme: ThemeEntry;
	scrollX: SharedValue<number>;
	viewportWidth: number;
	/** Center offsets of the previous, this and the next card. */
	prevCenter: number | undefined;
	center: number;
	nextCenter: number | undefined;
};

/** One theme's accent wash behind the carousel. Each card has its own layer,
 *  scoped to its theme, faded in as that card nears the viewport center, so
 *  neighbouring layers crossfade into each other while scrolling. The first
 *  and last layers stay full past the ends. */
export const ThemeCarouselGlow = ({
	theme,
	scrollX,
	viewportWidth,
	prevCenter,
	center,
	nextCenter,
}: Props) => {
	const animatedStyle = useAnimatedStyle(() => {
		const opacity = interpolate(
			scrollX.get() + viewportWidth / 2,
			[prevCenter ?? center - 1, center, nextCenter ?? center + 1],
			[
				prevCenter === undefined ? GLOW_OPACITY : 0,
				GLOW_OPACITY,
				nextCenter === undefined ? GLOW_OPACITY : 0,
			],
			Extrapolation.CLAMP
		);
		return { opacity };
	});

	return (
		<Animated.View
			pointerEvents="none"
			style={[StyleSheet.absoluteFill, animatedStyle]}
		>
			<ScopedTheme theme={theme.variants.dark}>
				<View className="flex-1 bg-accent" />
			</ScopedTheme>
		</Animated.View>
	);
};
