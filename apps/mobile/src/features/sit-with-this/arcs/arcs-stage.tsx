import { useEffect } from "react";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useTokenColor } from "@/lib/use-token-color";
import type { SitClock } from "../clock/use-sit-clock";
import { FADE, SIZE_SPRING, SIZES } from "../sit-look";
import type { ArcSize } from "../sit-model";
import { ArcLabel } from "./arc-label";
import { ArcsCanvas } from "./arcs-canvas";
import type { SitColors } from "./sit-colors";

type Props = {
	W: number;
	H: number;
	top: number;
	size: ArcSize;
	colors: SitColors;
	clock: SitClock;
	labelShown: boolean;
	paused: boolean;
	reduced: boolean;
};

/**
 * The arcs never leave (board card 04): one canvas that changes size with the
 * beat, small above a line, full to breathe, mid for the hand pulse, gone while
 * writing. The whole group moves on a critically damped spring from its
 * centre, as the board's `.arcs` transform; "gone" also fades over .6 s. Under
 * reduced motion the size still changes, on the same spring, so the arcs never
 * jump.
 */
export function ArcsStage({
	W,
	H,
	top,
	size,
	colors,
	clock,
	labelShown,
	paused,
	reduced,
}: Props) {
	const surface = useTokenColor("surface");
	const line = useTokenColor("separator");
	const target = SIZES[size];
	const y = useSharedValue(target.y);
	const scale = useSharedValue(target.scale);
	const opacity = useSharedValue(target.opacity);
	useEffect(() => {
		y.set(withSpring(target.y, { ...SIZE_SPRING, ...PLAY_AS_CHOSEN }));
		scale.set(withSpring(target.scale, { ...SIZE_SPRING, ...PLAY_AS_CHOSEN }));
		opacity.set(
			withTiming(target.opacity, {
				duration: FADE.arcsMs,
				easing: Easing.ease,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [target, y, scale, opacity]);

	const style = useAnimatedStyle(() => ({
		opacity: opacity.get(),
		transform: [{ translateY: y.get() }, { scale: scale.get() }],
	}));

	return (
		<Animated.View
			accessibilityElementsHidden
			className="absolute left-0"
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={[{ height: H, top, width: W }, style]}
		>
			<ArcsCanvas
				clock={clock}
				colors={colors}
				H={H}
				line={line}
				surface={surface}
				W={W}
			/>
			<ArcLabel
				clock={clock}
				paused={paused}
				reduced={reduced}
				shown={labelShown}
				W={W}
			/>
		</Animated.View>
	);
}
