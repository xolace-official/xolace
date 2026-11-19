import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	Easing,
	useAnimatedProps,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Icon } from "@/components/shared/icon";
import {
	HOME_CURVES,
	HOME_S,
	HOME_TIMING,
} from "@/features/explore/explore-style";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColors } from "@/lib/use-token-color";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const R = 17;
const STROKE = 2.5;
const C = 2 * Math.PI * R;
const GLYPH = 13;
const RING_EASE = Easing.bezier(...HOME_CURVES.ring);

/** native-cook's rail ring: a 2.5 pt arc in violet over a hairline track, play or pause inside. */
export function ProgressRing({
	share,
	playing,
}: {
	share: number;
	playing: boolean;
}) {
	const [track, arcInk, ink] = useTokenColors([
		"separator",
		"accent",
		"foreground",
	]);
	const reduced = useEffectiveReducedMotion();
	const size = HOME_S.cont.ring;
	const p = useSharedValue(reduced ? share : 0);
	useEffect(() => {
		p.set(
			reduced
				? share
				: withTiming(share, { duration: HOME_TIMING.ringMs, easing: RING_EASE })
		);
	}, [share, p, reduced]);
	const arc = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - p.get()) }));
	const mid = size / 2;

	return (
		<View
			className="items-center justify-center"
			style={{ height: size, width: size }}
		>
			<Svg
				height={size}
				style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
				width={size}
			>
				<Circle
					cx={mid}
					cy={mid}
					fill="none"
					r={R}
					stroke={track}
					strokeWidth={STROKE}
				/>
				{share > 0 ? (
					<AnimatedCircle
						animatedProps={arc}
						cx={mid}
						cy={mid}
						fill="none"
						r={R}
						stroke={arcInk}
						strokeDasharray={C}
						strokeLinecap="round"
						strokeWidth={STROKE}
					/>
				) : null}
			</Svg>
			<Icon
				color={ink}
				name={
					playing
						? { android: "pause", ios: "pause.fill" }
						: { android: "play_arrow", ios: "play.fill" }
				}
				size={GLYPH}
			/>
		</View>
	);
}
