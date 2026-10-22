import { View, Dimensions, StyleSheet } from "react-native";
import { useMemo, useCallback } from "react";
import { SymbolView } from "expo-symbols";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { Presets } from "react-native-pulsar";
import { scheduleOnRN } from "react-native-worklets";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import { AppText } from "@/src/components/shared/app-text";

const FLAME_COUNT = 5;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Account for FeedbackSheet.Frame px-6 (24px * 2) padding
const CONTAINER_WIDTH = SCREEN_WIDTH - 48;
const FLAME_WIDTH = CONTAINER_WIDTH / FLAME_COUNT;

const styles = StyleSheet.create({ gradientFill: { flex: 1 } });

const SPRING_BOUNCE = { damping: 8, stiffness: 320, mass: 0.6 };
const SPRING_SETTLE = { damping: 14, stiffness: 220, mass: 0.6 };
const SPRING_FILL = { damping: 20, stiffness: 180, mass: 0.6 };

type Props = {
  value: number;
  onChange: (intensity: number) => void;
};

export function FlameIntensitySelector({ value, onChange }: Props) {
  const accent = useThemeColor("accent") as string;
  const foreground = useThemeColor("foreground") as string;

  const gradientWidth = useSharedValue(
    value > 0 ? (value / FLAME_COUNT) * 100 : 0,
  );
  const s1 = useSharedValue(value >= 1 ? 1 : 0.75);
  const s2 = useSharedValue(value >= 2 ? 1 : 0.75);
  const s3 = useSharedValue(value >= 3 ? 1 : 0.75);
  const s4 = useSharedValue(value >= 4 ? 1 : 0.75);
  const s5 = useSharedValue(value >= 5 ? 1 : 0.75);

  const notifyDragEnd = useMemo(
    () => (rating: number) => {
      onChange(rating);
      Presets.plunk();
    },
    [onChange],
  );

  const updateScales = useCallback(
    (rating: number) => {
      "worklet";
      s1.set(withSpring(rating >= 1 ? 1 : 0.75, SPRING_SETTLE));
      s2.set(withSpring(rating >= 2 ? 1 : 0.75, SPRING_SETTLE));
      s3.set(withSpring(rating >= 3 ? 1 : 0.75, SPRING_SETTLE));
      s4.set(withSpring(rating >= 4 ? 1 : 0.75, SPRING_SETTLE));
      s5.set(withSpring(rating >= 5 ? 1 : 0.75, SPRING_SETTLE));
    },
    [s1, s2, s3, s4, s5],
  );

  const bounceFlame = (index: number) => {
    "worklet";
    if (index < 0 || index > 4) return;
    const sv = [s1, s2, s3, s4, s5][index];
    sv.set(
      withSpring(1.35, SPRING_BOUNCE, (finished) => {
        // Guard: since reanimated 4.5 a cancelled animation's callback fires
        // synchronously inside valueSetter before _animation is cleared, so an
        // unconditional sv.set() here re-enters the same callback infinitely.
        if (finished) sv.set(withSpring(1.0, SPRING_SETTLE));
      }),
    );
  };

  // useMemo keeps the gesture object stable across re-renders so GestureDetector
  // never swaps handlers mid-gesture. All captured values are stable:
  // shared values never change identity; notifyDragEnd is a stable ref function.
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(5)
        .activeOffsetX([-5, 5])
        .failOffsetY([-5, 5])
        .onStart((e) => {
          "worklet";
          const rating = Math.max(
            1,
            Math.min(FLAME_COUNT, Math.ceil(e.x / FLAME_WIDTH)),
          );
          gradientWidth.set(
            withSpring((rating / FLAME_COUNT) * 100, SPRING_FILL),
          );
          updateScales(rating);
        })
        .onUpdate((e) => {
          "worklet";
          const rating = Math.max(
            1,
            Math.min(FLAME_COUNT, Math.ceil(e.x / FLAME_WIDTH)),
          );
          gradientWidth.set(
            withSpring((rating / FLAME_COUNT) * 100, SPRING_FILL),
          );
          updateScales(rating);
        })
        .onEnd((e) => {
          "worklet";
          const rating = Math.max(
            1,
            Math.min(FLAME_COUNT, Math.ceil(e.x / FLAME_WIDTH)),
          );
          scheduleOnRN(notifyDragEnd, rating);
        }),
    [gradientWidth, notifyDragEnd, updateScales],
  );

  const handleTap = (intensity: number) => {
    gradientWidth.set(withSpring((intensity / FLAME_COUNT) * 100, SPRING_FILL));
    updateScales(intensity);
    bounceFlame(intensity - 1);
    Presets.plunk();
    onChange(intensity);
  };

  const gradientStyle = useAnimatedStyle(() => ({
    width: `${gradientWidth.get()}%`,
    opacity: gradientWidth.get() > 0 ? 1 : 0,
  }));

  const f1Style = useAnimatedStyle(() => ({
    transform: [{ scale: s1.get() }],
    opacity: interpolate(s1.get(), [0.75, 1], [0.2, 1]),
  }));
  const f2Style = useAnimatedStyle(() => ({
    transform: [{ scale: s2.get() }],
    opacity: interpolate(s2.get(), [0.75, 1], [0.2, 1]),
  }));
  const f3Style = useAnimatedStyle(() => ({
    transform: [{ scale: s3.get() }],
    opacity: interpolate(s3.get(), [0.75, 1], [0.2, 1]),
  }));
  const f4Style = useAnimatedStyle(() => ({
    transform: [{ scale: s4.get() }],
    opacity: interpolate(s4.get(), [0.75, 1], [0.2, 1]),
  }));
  const f5Style = useAnimatedStyle(() => ({
    transform: [{ scale: s5.get() }],
    opacity: interpolate(s5.get(), [0.75, 1], [0.2, 1]),
  }));

  const flameStyles = [f1Style, f2Style, f3Style, f4Style, f5Style];

  return (
    <View className="gap-2">
      <GestureDetector gesture={panGesture}>
        <Animated.View className="h-14 rounded-2xl overflow-hidden bg-default-soft-hover">
          {/* Gradient fill bar */}
          <Animated.View
            style={gradientStyle}
            className="absolute inset-y-0 left-0"
          >
            <LinearGradient
              colors={[`${accent}50`, `${accent}CC`, accent]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientFill}
            />
          </Animated.View>

          {/* Flames row */}
          <Animated.View className="flex-row h-full items-center justify-around px-2">
            {Array.from({ length: FLAME_COUNT }, (_, i) => {
              const intensity = i + 1;
              return (
                <PressableFeedback
                  key={intensity}
                  onPress={() => handleTap(intensity)}
                  accessibilityRole="button"
                  accessibilityLabel={`Intensity ${intensity} of ${FLAME_COUNT}`}
                  accessibilityState={{ selected: value === intensity }}
                  className="flex-1 items-center justify-center h-full"
                >
                  <Animated.View style={flameStyles[i]}>
                    <SymbolView
                      name={{ ios: "flame.fill", android: "local_fire_department", web: "local_fire_department" }}
                      size={26}
                      tintColor={foreground}
                      resizeMode="scaleAspectFit"
                    />
                  </Animated.View>
                </PressableFeedback>
              );
            })}
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* Slider affordance hint */}
      <View className="flex-row items-center justify-center gap-1.5">
        <SymbolView
          name={{
            ios: "arrow.left.and.right",
            android: "swap_horiz",
            web: "swap_horiz",
          }}
          size={10}
          tintColor={`${foreground}40`}
          resizeMode="scaleAspectFit"
        />
        <AppText className="text-xs font-light text-foreground/25">
          tap a flame or drag across
        </AppText>
      </View>
    </View>
  );
}
