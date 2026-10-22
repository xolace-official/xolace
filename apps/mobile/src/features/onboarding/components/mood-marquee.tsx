import React, { memo } from "react";
import { useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
	Easing,
	type SharedValue,
	useFrameCallback,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import {
	getCardWidth,
	MoodCard,
	type MoodItem,
} from "@/src/features/onboarding/components/mood-card";

const AUTO_SCROLL_SPEED = 18;
const ROW_STYLE = { flexDirection: "row" as const, height: "100%" as const };

type Props = {
	moods: MoodItem[];
	scrollOffsetX: SharedValue<number>;
};

const MoodMarqueeComponent = ({ moods, scrollOffsetX }: Props) => {
	"use no memo";
	const { width: screenWidth } = useWindowDimensions();
	const cardWidth = getCardWidth(screenWidth);
	const scrollSpeed = useSharedValue(AUTO_SCROLL_SPEED);
	const allItemsWidth = moods.length * cardWidth;

	useFrameCallback((frameInfo) => {
		const dt = (frameInfo?.timeSincePreviousFrame ?? 0) / 1000;
		scrollOffsetX.set(scrollOffsetX.get() + scrollSpeed.get() * dt);
	});

	const gesture = Gesture.Pan()
		.onBegin(() => {
			scrollSpeed.set(0);
		})
		.onChange((e) => {
			scrollOffsetX.set(scrollOffsetX.get() - e.changeX);
		})
		.onFinalize((e) => {
			scrollSpeed.set(-e.velocityX);
			scrollSpeed.set(
				withTiming(AUTO_SCROLL_SPEED, {
					duration: 1200,
					easing: Easing.out(Easing.quad),
				})
			);
		});

	return (
		<GestureDetector gesture={gesture}>
			<View style={ROW_STYLE}>
				{moods.map((mood, index) => (
					<MoodCard
						allItemsWidth={allItemsWidth}
						cardWidth={cardWidth}
						index={index}
						item={mood}
						key={mood.id}
						screenWidth={screenWidth}
						scrollOffsetX={scrollOffsetX}
					/>
				))}
			</View>
		</GestureDetector>
	);
};

export const MoodMarquee = memo(MoodMarqueeComponent);
