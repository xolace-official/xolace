import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";

const HEART_ICON = { ios: "heart.fill", android: "favorite" } as const;

/**
 * The full-screen burst on resonate. It survives the redesign unchanged (#303)
 * — and it is the one part of this screen that is deliberately *themed*: it
 * fires over the whole window, not on the poster, so it takes `--accent`.
 */
export function useHeartBurst() {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  const trigger = () => {
    scale.set(0);
    opacity.set(1);
    scale.set(
      withSequence(
        withSpring(1.5, { damping: 6, stiffness: 200 }),
        withDelay(180, withTiming(0, { duration: 320 })),
      ),
    );
    opacity.set(
      withSequence(
        withTiming(1, { duration: 40 }),
        withDelay(350, withTiming(0, { duration: 270 })),
      ),
    );
  };

  return { scale, opacity, trigger };
}

export function HeartBurst({ scale, opacity }: Omit<ReturnType<typeof useHeartBurst>, "trigger">) {
  const accentColor = useThemeColor("accent") as string;
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
    opacity: opacity.get(),
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.burst, style]}>
      <SymbolView name={HEART_ICON} size={96} tintColor={accentColor} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  burst: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
});
