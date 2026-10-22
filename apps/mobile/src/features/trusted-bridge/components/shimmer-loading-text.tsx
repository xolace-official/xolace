import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Shimmer from "@/src/components/shared/shimmer-v2";
import { AppText } from "@/src/components/shared/app-text";

type Props = {
  name: string;
};

const BOB_EASING = Easing.inOut(Easing.ease);

const styles = StyleSheet.create({
  shimmerGradient: {
    experimental_backgroundImage:
      "linear-gradient(to right, transparent 0%, rgba(255,255,255,0.95) 40%, rgba(255,255,255,0.95) 60%, transparent 100%)",
  },
  mascot: { width: 132, height: 132 },
});

// Static shimmer layers — hoisted so they aren't re-created per render and
// aren't flagged as JSX-as-prop (react-perf/jsx-no-jsx-as-prop).
const BACKGROUND = <View className="flex-1 bg-foreground/25" />;
const OVERLAY = (
  <Shimmer.Overlay
    width="100%"
    animation={{
      type: "timing",
      config: { duration: 1900, easing: Easing.inOut(Easing.ease) },
    }}
  >
    <View className="flex-1" style={styles.shimmerGradient} />
  </Shimmer.Overlay>
);

export function ShimmerLoadingText({ name }: Props) {
  const recipient = name.trim() || "them";

  // Gentle float — signals the mascot is "thinking it over" while the draft loads.
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.set(withRepeat(withTiming(1, { duration: 1800, easing: BOB_EASING }), -1, true));
  }, [bob]);
  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * bob.get() }],
  }));

  return (
    <View className="items-center px-8 gap-3">
      <Animated.View style={mascotStyle} className="mb-3">
        <Image
          source={require("@/assets/images/flux/loading-1.png")}
          style={styles.mascot}
          contentFit="contain"
        />
      </Animated.View>

      <Shimmer>
        <Shimmer.Mask background={BACKGROUND} overlay={OVERLAY}>
          <AppText className="text-black text-xl font-light text-center leading-8">
            {`Finding the words for ${recipient}…`}
          </AppText>
        </Shimmer.Mask>
      </Shimmer>

      <AppText className="text-sm font-light text-foreground/35 text-center leading-5">
        Turning what you felt into something you can say.
      </AppText>
    </View>
  );
}
