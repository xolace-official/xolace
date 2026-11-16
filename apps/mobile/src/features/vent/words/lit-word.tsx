import { useEffect } from "react";
import type { LayoutRectangle } from "react-native";
import Animated, {
	Easing,
	interpolate,
	interpolateColor,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { AnimatedAppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { LIT_MS } from "@/features/vent/vent-model";
import { amber, VENT_COLORS } from "@/features/vent/vent-palette";

/** The board's keyframe: at 30% of its light the word is lit, then it cools for the rest. */
const CATCH = 0.3;
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
const RISE = 6;
const GLOW_RADIUS = 13;
const GLOW = [0.9, 0.65, 0] as const;
/** v2, Reduce Motion: the words fade in together. */
const REDUCED_IN_MS = 300;
const NO_OFFSET = { height: 0, width: 0 } as const;

type Props = {
	word: string;
	/** When this word starts to light, from when the voice starts; null until it does. */
	startMs: number | null;
	reduced: boolean;
	fontSize: number;
	lineHeight: number;
	onLayout: (b: LayoutRectangle) => void;
};

/**
 * One word catching (native-cook matchstick-strike-button's heat, ember-glow-story's rise):
 * from nothing, amber, 6 pt low and glowing → lit (#F0B860, in place, glow 0.65) at 30% → cream,
 * no glow, over 900 ms. The board eases each keyframe interval, so the two legs are eased
 * separately. The blur is dropped (iOS text has no animated blur); colour, glow and rise stay.
 */
export function LitWord({
	word,
	startMs,
	reduced,
	fontSize,
	lineHeight,
	onLayout,
}: Props) {
	const p = useSharedValue(0);
	useEffect(() => {
		if (startMs === null) {
			return;
		}
		if (reduced) {
			p.set(withTiming(1, { duration: REDUCED_IN_MS, ...PLAY_AS_CHOSEN }));
			return;
		}
		const leg = (to: number, share: number) =>
			withTiming(to, {
				duration: LIT_MS * share,
				easing: EASE,
				...PLAY_AS_CHOSEN,
			});
		p.set(
			withDelay(
				startMs,
				withSequence(leg(CATCH, CATCH), leg(1, 1 - CATCH)),
				PLAY_AS_CHOSEN.reduceMotion
			)
		);
	}, [startMs, reduced, p]);

	const box = useAnimatedStyle(() => {
		const v = p.get();
		if (reduced) {
			return { opacity: v };
		}
		return {
			opacity: interpolate(v, [0, CATCH], [0, 1], "clamp"),
			transform: [
				{ translateY: interpolate(v, [0, CATCH], [RISE, 0], "clamp") },
			],
		};
	});
	const ink = useAnimatedStyle(() => ({
		color: reduced
			? VENT_COLORS.cream
			: interpolateColor(
					p.get(),
					[0, CATCH, 1],
					[VENT_COLORS.amber, VENT_COLORS.lit, VENT_COLORS.cream]
				),
	}));
	const glow = useAnimatedStyle(() => ({
		opacity: reduced ? 0 : interpolate(p.get(), [0, CATCH, 1], [...GLOW]),
	}));
	const size = { fontSize, lineHeight };

	return (
		<Animated.View onLayout={(e) => onLayout(e.nativeEvent.layout)} style={box}>
			<AnimatedAppText
				className="absolute top-0 left-0 text-vent-amber"
				style={[
					size,
					{
						textShadowColor: amber(1),
						textShadowOffset: NO_OFFSET,
						textShadowRadius: GLOW_RADIUS,
					},
					glow,
				]}
				variant="body"
			>
				{word}
			</AnimatedAppText>
			<AnimatedAppText style={[size, ink]} variant="body">
				{word}
			</AnimatedAppText>
		</Animated.View>
	);
}
