import { useEffect } from "react";
import Animated, {
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useTokenColor } from "@/lib/use-token-color";
import { HEARD_MOTION } from "../motion";

/** Board `.hword`: the display face at 46/50, −.035em. */
const WORD_CLASS = "text-[46px] leading-[50px] tracking-[-1.61px]";
const WORD_EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
/** The word is fully in by 55% of its write-in; the halo peaks there and is gone by the end. */
const IN_BY = 0.55;
const RISE = 8;
const HALO_R = 14;

/**
 * "Heard." writes in like a mirror word (board `mwA`, .9 s): it rises 8 pt and fades in, a warm
 * halo swelling and going as it lands. Reduce Motion shows it at once.
 */
export function HeardTitle({
	title,
	reduced,
}: {
	title: string;
	reduced: boolean;
}) {
	const halo = useTokenColor("reflect-heard-halo");
	const word = useSharedValue(reduced ? 1 : 0);

	useEffect(() => {
		if (reduced) {
			word.set(1);
			return;
		}
		word.set(
			withDelay(
				HEARD_MOTION.wordDelayMs,
				withTiming(1, {
					duration: HEARD_MOTION.wordMs,
					easing: WORD_EASE,
					...PLAY_AS_CHOSEN,
				}),
				ReduceMotion.Never
			)
		);
	}, [reduced, word]);

	const wordStyle = useAnimatedStyle(() => ({
		opacity: Math.min(1, word.get() / IN_BY),
		transform: [{ translateY: RISE * (1 - word.get()) }],
	}));
	const haloStyle = useAnimatedStyle(() => ({
		opacity: Math.sin(Math.PI * Math.min(1, word.get() / IN_BY)),
	}));

	return (
		<Animated.View
			accessibilityLabel={title}
			accessibilityRole="header"
			accessible
			className="mt-2"
			style={wordStyle}
		>
			<AppText center className={WORD_CLASS} variant="display">
				{title}
			</AppText>
			<Animated.View
				className="absolute inset-0"
				pointerEvents="none"
				style={haloStyle}
			>
				<AppText
					center
					className={WORD_CLASS}
					style={{ textShadowColor: halo, textShadowRadius: HALO_R }}
					variant="display"
				>
					{title}
				</AppText>
			</Animated.View>
		</Animated.View>
	);
}
