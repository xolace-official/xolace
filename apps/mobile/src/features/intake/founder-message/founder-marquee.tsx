import { memo } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	Easing,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
	useFrameCallback,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";

import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

import { FounderCard } from "./founder-card";
import { FOUNDER_MARQUEE_CARDS } from "./marquee-data";
import {
	beltSlots,
	CARD_HEIGHT,
	CARD_STRIDE,
	CARD_WIDTH,
	slotLeft,
} from "./marquee-geometry";

// Auto-drift belt with pan-to-nudge, the same mechanic as the onboarding MoodMarquee but
// with Skia-clipped cards. Not shared: MoodMarquee centres its track and hands its offset
// up for parallax. Reduced motion stops the drift; the belt still pans by hand.

const AUTO_SPEED = 16; // px/s
const ROTATIONS = [-4, 3, -2, 4, -3];

type Props = {
	/** Width of the visible track. */
	viewport: number;
};

const FounderMarqueeComponent = ({ viewport }: Props) => {
	"use no memo";
	const reducedMotion = useEffectiveReducedMotion();
	const restSpeed = reducedMotion ? 0 : AUTO_SPEED;
	const offset = useSharedValue(0);
	const speed = useSharedValue(restSpeed);

	// Wide screens get extra slots so the belt is always wider than the track.
	const slots = beltSlots(viewport, FOUNDER_MARQUEE_CARDS.length);
	const beltWidth = slots * CARD_STRIDE;

	useFrameCallback((frame) => {
		const dt = (frame?.timeSincePreviousFrame ?? 0) / 1000;
		offset.set(offset.get() + speed.get() * dt);
	});

	const pan = Gesture.Pan()
		.onBegin(() => speed.set(0))
		.onChange((e) => offset.set(offset.get() - e.changeX))
		.onFinalize((e) => {
			speed.set(-e.velocityX);
			speed.set(
				withTiming(restSpeed, {
					duration: 1100,
					easing: Easing.out(Easing.quad),
				})
			);
		});

	return (
		<GestureDetector gesture={pan}>
			<View className="flex-1">
				{Array.from({ length: slots }, (_, index) => (
					<BeltCard
						beltWidth={beltWidth}
						index={index}
						key={index}
						offset={offset}
						viewport={viewport}
					/>
				))}
			</View>
		</GestureDetector>
	);
};

export const FounderMarquee = memo(FounderMarqueeComponent);

type BeltCardProps = {
	index: number;
	viewport: number;
	beltWidth: number;
	offset: SharedValue<number>;
};

const BeltCard = ({ index, viewport, beltWidth, offset }: BeltCardProps) => {
	const card = FOUNDER_MARQUEE_CARDS[index % FOUNDER_MARQUEE_CARDS.length];

	const style = useAnimatedStyle(() => {
		const left = slotLeft(index, offset.get(), beltWidth, viewport);
		return {
			left,
			opacity: interpolate(
				left,
				[-CARD_WIDTH, 0, viewport - CARD_WIDTH, viewport],
				[0.2, 1, 1, 0.2],
				"clamp"
			),
			position: "absolute" as const,
			top: 0,
			transform: [
				{
					scale: interpolate(
						left,
						[-CARD_WIDTH, (viewport - CARD_WIDTH) / 2, viewport],
						[0.86, 1, 0.86],
						"clamp"
					),
				},
			],
		};
	});

	return (
		<Animated.View style={style}>
			<FounderCard
				card={card}
				height={CARD_HEIGHT}
				rotationDeg={ROTATIONS[index % ROTATIONS.length]}
				width={CARD_WIDTH}
			/>
		</Animated.View>
	);
};
