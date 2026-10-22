import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

const ENTERING = FadeIn.duration(1000);
const BASE_COLORS: readonly [string, string, string] = [
  "#1a0f08",
  "#2a1810",
  "#0d0a08",
];
const OVERLAY_COLORS: readonly [string, string, string] = [
  "#D4A05815",
  "#C4803C10",
  "#A0602008",
];
const START_TOP_LEFT = { x: 0, y: 0 };
const END_BOTTOM_RIGHT = { x: 1, y: 1 };
const START_TOP_RIGHT = { x: 0.8, y: 0 };
const END_BOTTOM_LEFT = { x: 0.2, y: 1 };

export const AuthBg = () => {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.set(withRepeat(
      withTiming(0.7, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    ));
  }, [opacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
  }));

  const pulseContainerStyle = [StyleSheet.absoluteFill, pulseStyle];

  return (
    <>
      <AnimatedGradient
        entering={ENTERING}
        colors={BASE_COLORS}
        start={START_TOP_LEFT}
        end={END_BOTTOM_RIGHT}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={pulseContainerStyle}>
        <AnimatedGradient
          colors={OVERLAY_COLORS}
          start={START_TOP_RIGHT}
          end={END_BOTTOM_LEFT}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </>
  );
};
