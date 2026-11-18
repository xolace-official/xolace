import { type ComponentProps, useEffect } from "react";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useTokenColor } from "@/lib/use-token-color";

/** The soft copy's glyphs under their halo (the board: ink at 22%, halo at 69%). */
const SOFT_GLYPHS = 0.35;

type Props = Omit<ComponentProps<typeof AppText>, "children"> & {
	text: string;
	/** Plays on mount; remount (a new key) to play again. */
	play: boolean;
	duration: number;
	delay?: number;
	/** Rises this many points into place. */
	rise: number;
	/** The blur the text comes out of (its halo radius). */
	blur: number;
	/** The worklet curve, applied to progress. */
	ease: (x: number) => number;
	/** Colour of the soft copy's halo; the text's own colour by default. */
	inkColor?: string;
};

/**
 * Text that comes into focus. RN on iOS can't blur a view (the SwiftUI filter
 * flag is off in 0.88), so a soft copy (faint glyphs in a halo of the same
 * ink) crossfades into the sharp text while both rise and fade in. Opacity and
 * transform only: nothing is laid out per frame.
 */
export function SoftText({
	text,
	play,
	duration,
	delay = 0,
	rise,
	blur,
	ease,
	inkColor,
	style,
	...rest
}: Props) {
	const foreground = useTokenColor("foreground");
	const p = useSharedValue(play ? 0 : 1);

	useEffect(() => {
		if (!play) {
			return;
		}
		p.set(
			withDelay(
				delay,
				withTiming(1, { duration, easing: Easing.linear, ...PLAY_AS_CHOSEN }),
				PLAY_AS_CHOSEN.reduceMotion
			)
		);
	}, [delay, duration, p, play]);

	const wrap = useAnimatedStyle(() => ({
		transform: [{ translateY: rise * (1 - ease(p.get())) }],
	}));
	const sharp = useAnimatedStyle(() => {
		const a = ease(p.get());
		return { opacity: a * a };
	});
	const soft = useAnimatedStyle(() => {
		const a = ease(p.get());
		return { opacity: a * (1 - a) * 2 };
	});

	if (!play) {
		return (
			<AppText style={style} {...rest}>
				{text}
			</AppText>
		);
	}
	const ink = inkColor ?? foreground;
	return (
		<Animated.View style={wrap}>
			<Animated.View style={sharp}>
				<AppText style={style} {...rest}>
					{text}
				</AppText>
			</Animated.View>
			<Animated.View
				accessibilityElementsHidden
				className="absolute inset-x-0 top-0"
				importantForAccessibility="no-hide-descendants"
				style={soft}
			>
				<AppText
					style={[
						style,
						{
							color: `${ink}38`,
							textShadowColor: `${ink}B0`,
							textShadowRadius: blur,
						},
					]}
					{...rest}
				>
					{text}
				</AppText>
			</Animated.View>
		</Animated.View>
	);
}
