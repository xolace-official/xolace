import { useEffect } from "react";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { Image, LinearGradient } from "@/components/shared/styled";
import { clearOf } from "@/design/clear-of";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";

const POSTCARD = require("@/assets/images/flux/plus-postcard-bg.png");
const PLUS_OPACITY = 0.75;
/** Flux greys on Free: dimmed, since iOS has no image desaturation without Skia. */
const FREE_OPACITY = 0.32;
const FLIP_MS = 350;

/** Flux's postcard behind the top of the page, brighter on Plus, fading into the page. */
export function PlusArt({ plus }: { plus: boolean }) {
	const reduced = useEffectiveReducedMotion();
	const bg = useTokenColor("background");
	const target = plus ? PLUS_OPACITY : FREE_OPACITY;
	const opacity = useSharedValue(target);
	useEffect(() => {
		opacity.set(reduced ? target : withTiming(target, { duration: FLIP_MS }));
	}, [opacity, reduced, target]);
	const art = useAnimatedStyle(() => ({ opacity: opacity.get() }));
	return (
		<>
			<Animated.View
				accessibilityElementsHidden
				className="absolute inset-x-0 top-0 h-75"
				importantForAccessibility="no-hide-descendants"
				style={art}
			>
				<Image className="flex-1" contentFit="cover" source={POSTCARD} />
			</Animated.View>
			<LinearGradient
				className="absolute inset-x-0 top-35 h-40"
				colors={[clearOf(bg), bg]}
				pointerEvents="none"
			/>
		</>
	);
}
