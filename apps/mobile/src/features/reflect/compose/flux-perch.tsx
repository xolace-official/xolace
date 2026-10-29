import { Image } from "expo-image";
import { useIsFocused } from "expo-router/react-navigation";
import { useEffect } from "react";
import Animated, {
	cancelAnimation,
	Easing,
	Extrapolation,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withRepeat,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import {
	DOT_SIZE,
	FLUX_SIZE,
	HANDOFF,
	useMorphGeometry,
} from "@/features/reflect/compose/morph-geometry";

const FLUX = require("@/assets/images/flux/flux-whisper.png");

/** He settles onto the card rather than popping onto it. */
const ENTRANCE_SPRING = { damping: 20, mass: 1, stiffness: 80 } as const;
const ENTRANCE_RISE = 22;
/** Long enough for the entrance and the morph to have settled. */
const BREATH_DELAY_MS = 700;
const BREATH_HALF_MS = 2600;

type Props = {
	progress: SharedValue<number>;
	/** The reduced-motion cross-fade's opacity. 1 whenever motion is allowed. */
	fade: SharedValue<number>;
	expanded: boolean;
	reduceMotion: boolean;
};

/**
 * Flux on the resting card, fading into the presence dot as it opens. Breathing pauses when open.
 */
export const FluxPerch = ({
	progress,
	fade,
	expanded,
	reduceMotion,
}: Props) => {
	const geo = useMorphGeometry();
	const entrance = useSharedValue(reduceMotion ? 1 : 0);
	const breath = useSharedValue(0);
	// A loop under a pushed screen still commits every frame: breathe only in front.
	const isFocused = useIsFocused();

	useEffect(() => {
		if (reduceMotion) {
			entrance.set(1);
			return;
		}
		entrance.set(withSpring(1, ENTRANCE_SPRING));
	}, [entrance, reduceMotion]);

	useEffect(() => {
		if (reduceMotion) {
			return;
		}
		if (expanded || !isFocused) {
			cancelAnimation(breath);
			breath.set(withTiming(0, { duration: 300 }));
			return;
		}
		breath.set(
			withDelay(
				BREATH_DELAY_MS,
				withRepeat(
					withSequence(
						withTiming(1, {
							duration: BREATH_HALF_MS,
							easing: Easing.inOut(Easing.quad),
						}),
						withTiming(0, {
							duration: BREATH_HALF_MS,
							easing: Easing.inOut(Easing.quad),
						})
					),
					-1,
					false
				)
			)
		);
		return () => cancelAnimation(breath);
	}, [breath, expanded, isFocused, reduceMotion]);

	const style = useAnimatedStyle(() => {
		const p = progress.get();
		const e = entrance.get();
		const b = breath.get();
		const perch = geo.fluxPerch;

		return {
			opacity:
				fade.get() *
				e *
				interpolate(p, [0, HANDOFF], [1, 0], Extrapolation.CLAMP),
			transform: [
				{ translateX: interpolate(p, [0, 1], [0, geo.dotX - geo.fluxLeft]) },
				{
					translateY:
						interpolate(
							p,
							[0, 1],
							[perch.dy, geo.dotY - geo.fluxTop - perch.dy]
						) +
						(1 - e) * ENTRANCE_RISE,
				},
				{
					scale: interpolate(
						p,
						[0, 1],
						[
							perch.scale * (0.94 + e * 0.06) * (1 + b * 0.02),
							DOT_SIZE / FLUX_SIZE,
						]
					),
				},
				{ translateY: b * -3 },
			],
		};
	});

	return (
		<Animated.View
			pointerEvents="none"
			style={[
				{
					height: FLUX_SIZE,
					left: geo.fluxLeft,
					position: "absolute",
					top: geo.fluxTop,
					width: FLUX_SIZE,
				},
				style,
			]}
		>
			<Image
				accessibilityLabel="Flux, leaning on the card"
				contentFit="contain"
				source={FLUX}
				style={{ height: "100%", width: "100%" }}
			/>
		</Animated.View>
	);
};
