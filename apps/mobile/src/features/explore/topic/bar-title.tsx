import { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { AnimatedAppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { EX_TIMING } from "@/features/explore/explore-style";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const TIMING = { duration: EX_TIMING.edgeMs, ...PLAY_AS_CHOSEN };
const RISE = 4;

export function BarTitle({ text, on }: { text: string; on: boolean }) {
	const reduced = useEffectiveReducedMotion();
	const style = useAnimatedStyle(() => ({
		opacity: withTiming(on ? 1 : 0, TIMING),
		transform: [
			{ translateY: reduced ? 0 : withTiming(on ? 0 : RISE, TIMING) },
		],
	}));
	return (
		<AnimatedAppText
			accessibilityElementsHidden={!on}
			accessibilityRole="header"
			className="max-w-55 leading-[22px]"
			numberOfLines={1}
			style={style}
			variant="body"
			weight="semibold"
		>
			{text}
		</AnimatedAppText>
	);
}
