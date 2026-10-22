import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/src/components/shared/app-text";

type StarConfig = {
  id: string;
  x: number;
  y: number;
  rotate: number;
  scale: number;
  delayMs: number;
  durationMs: number;
  fontSize: number;
  position: { top?: number; bottom?: number; left?: number; right?: number };
};

const STARS: StarConfig[] = [
  {
    id: "star-bottom-left",
    x: -10,
    y: 12,
    rotate: 15,
    scale: 1.1,
    delayMs: 500,
    durationMs: 3000,
    fontSize: 26,
    position: { bottom: 40, left: 80 },
  },
  {
    id: "star-top-right",
    x: 15,
    y: 10,
    rotate: 20,
    scale: 0.9,
    delayMs: 1200,
    durationMs: 3500,
    fontSize: 22,
    position: { top: 0, right: 80 },
  },
  {
    id: "star-top-left",
    x: -8,
    y: -10,
    rotate: 25,
    scale: 1.0,
    delayMs: 800,
    durationMs: 3200,
    fontSize: 20,
    position: { top: 15, left: 80 },
  },
  {
    id: "star-bottom-right",
    x: 12,
    y: -8,
    rotate: 18,
    scale: 0.95,
    delayMs: 1500,
    durationMs: 3800,
    fontSize: 26,
    position: { bottom: 40, right: 100 },
  },
];

const STAR_CHARACTER = "✦";

// Worklet-driven, NOT a Reanimated CSS animation (`animationName` keyframes).
// A view carrying a running CSS animation that unmounts mid-flight throws
// "Attempt to unmount a view which is mounted inside a different view" in
// Fabric's mounting transaction, which hard-crashes the app (SIGABRT). The
// processing state unmounts exactly that way whenever a reflection errors
// fast (e.g. a rate-limit rejection). See docs/bug-log.md.
const Star = ({ star, color }: { star: StarConfig; color: string }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(
        star.delayMs,
        withRepeat(
          withTiming(1, {
            duration: star.durationMs,
            easing: Easing.bezier(0.42, 0, 0.58, 1),
          }),
          -1,
          false,
        ),
      ),
    );
  }, [progress, star.delayMs, star.durationMs]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p,
      transform: [
        { translateX: interpolate(p, [0, 1], [0, star.x]) },
        { translateY: interpolate(p, [0, 1], [0, star.y]) },
        { rotateZ: `${interpolate(p, [0, 1], [-star.rotate, star.rotate])}deg` },
        { scale: interpolate(p, [0, 0.6, 1], [0.3, star.scale, 0]) },
      ],
    };
  });

  // The plain View is what the parent reconciles; the animated node is nested
  // one level down and is never itself a child Fabric has to index into.
  return (
    <View style={[starStyles.star, star.position]} pointerEvents="none">
      <Animated.View style={animatedStyle} pointerEvents="none">
        <AppText accessible={false} style={{ fontSize: star.fontSize, color }}>
          {STAR_CHARACTER}
        </AppText>
      </Animated.View>
    </View>
  );
};

type Props = {
  color: string;
};

const SparkleStarsComponent = ({ color }: Props) => (
  <View
    style={starStyles.wrapper}
    pointerEvents="none"
    accessibilityElementsHidden={true}
    importantForAccessibility="no-hide-descendants"
  >
    {STARS.map((star) => (
      <Star key={star.id} star={star} color={color} />
    ))}
  </View>
);

export const SparkleStars = SparkleStarsComponent;

const starStyles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    position: "absolute",
  },
  // No `opacity: 0` here — opacity is driven on the animated child below.
  // Setting it on this static parent would multiply the child's animated
  // opacity by zero and the stars would never appear.
  star: {
    position: "absolute",
  },
});
