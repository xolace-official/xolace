import Animated, {
	Extrapolation,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";

// Distance (px) from center at which the scale/opacity falloff maxes out.
const FALLOFF_RANGE = 178;

type Props = {
	scrollX: SharedValue<number>;
	center: number;
	viewportWidth: number;
	reducedMotion: boolean;
	children: React.ReactNode;
};

/** Scroll-driven scale/opacity falloff for one card, based on the card's fixed
 * center offset because the divider's width breaks a per-index interpolation. */
export const ThemeCarouselItem = ({
	scrollX,
	center,
	viewportWidth,
	reducedMotion,
	children,
}: Props) => {
	const animatedStyle = useAnimatedStyle(() => {
		if (reducedMotion) {
			return { opacity: 1, transform: [{ scale: 1 }] };
		}
		const distance = scrollX.get() + viewportWidth / 2 - center;
		const scale = interpolate(
			distance,
			[-FALLOFF_RANGE, 0, FALLOFF_RANGE],
			[0.86, 1.1, 0.86],
			Extrapolation.CLAMP
		);
		const opacity = interpolate(
			distance,
			[-FALLOFF_RANGE, 0, FALLOFF_RANGE],
			[0.55, 1, 0.55],
			Extrapolation.CLAMP
		);
		return { opacity, transform: [{ scale }] };
	});

	return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};
