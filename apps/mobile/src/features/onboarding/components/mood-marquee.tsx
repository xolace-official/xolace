import React, { memo } from "react";
import { View, useWindowDimensions } from "react-native";
import {
  Easing,
  SharedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import {
  MoodCard,
  MoodItem,
  getCardWidth,
} from "@/src/features/onboarding/components/mood-card";

const AUTO_SCROLL_SPEED = 18;
const ROW_STYLE = { height: "100%" as const, flexDirection: "row" as const };

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
      scrollSpeed.set(withTiming(AUTO_SCROLL_SPEED, {
        duration: 1200,
        easing: Easing.out(Easing.quad),
      }));
    });

  return (
    <GestureDetector gesture={gesture}>
      <View style={ROW_STYLE}>
        {moods.map((mood, index) => (
          <MoodCard
            key={mood.id}
            item={mood}
            index={index}
            scrollOffsetX={scrollOffsetX}
            allItemsWidth={allItemsWidth}
            cardWidth={cardWidth}
            screenWidth={screenWidth}
          />
        ))}
      </View>
    </GestureDetector>
  );
};

export const MoodMarquee = memo(MoodMarqueeComponent);
