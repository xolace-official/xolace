import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";
import { LETTER_MOTION } from "./letter-motion";
import { useLetterInk } from "./letter-paper";
import { type SentStatus, sentLit } from "./letters-model";

const M = LETTER_MOTION;
const SIZE = M.mark.size;
const RING = M.mark.ring;
const ARRIVE = Easing.bezier(...M.curves.arrive);
const SOFT = Easing.inOut(Easing.ease);
const UNLIT_OPACITY = 0.5;
const FROM_SCALE = 0.6;

export function ReceivedMark({
	status,
	ignite = false,
}: {
	status: SentStatus;
	ignite?: boolean;
}) {
	const ink = useLetterInk();
	const subtle = useTokenColor("subtle");
	const surface = useTokenColor("surface");
	const reduced = useEffectiveReducedMotion();
	const lit = sentLit(status);
	const play = ignite && lit;
	const opacity = useSharedValue(play ? 0 : 1);
	const scale = useSharedValue(play && !reduced ? FROM_SCALE : 1);

	useEffect(() => {
		if (!play) {
			return;
		}
		opacity.set(0);
		scale.set(reduced ? 1 : FROM_SCALE);
		if (reduced) {
			opacity.set(withTiming(1, { duration: M.reducedMs, ...PLAY_AS_CHOSEN }));
			return;
		}
		const [a, b, c] = M.ignite;
		opacity.set(
			withSequence(
				withTiming(a.to, { duration: a.ms, easing: ARRIVE, ...PLAY_AS_CHOSEN }),
				withTiming(b.to, { duration: b.ms, easing: SOFT, ...PLAY_AS_CHOSEN }),
				withTiming(c.to, { duration: c.ms, easing: SOFT, ...PLAY_AS_CHOSEN })
			)
		);
		scale.set(
			withTiming(1, {
				duration: M.mark.igniteMs,
				easing: ARRIVE,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [play, reduced, opacity, scale]);

	const style = useAnimatedStyle(() => ({
		opacity: opacity.get(),
		transform: [{ scale: scale.get() }],
	}));

	if (!lit) {
		return (
			<View
				style={{
					borderRadius: SIZE / 2,
					boxShadow: `inset 0px 0px 0px ${RING}px ${subtle}`,
					height: SIZE,
					opacity: UNLIT_OPACITY,
					width: SIZE,
				}}
			/>
		);
	}
	return (
		<Animated.View
			style={[
				{
					borderRadius: SIZE / 2,
					boxShadow:
						status === "acknowledged"
							? ink.markAcknowledged(surface)
							: ink.markGlow,
					experimental_backgroundImage: ink.emberFill,
					height: SIZE,
					width: SIZE,
				},
				style,
			]}
		/>
	);
}
