import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const EASING = Easing.bezier(0.455, 0.03, 0.515, 0.955);

const styles = StyleSheet.create({
  layer: StyleSheet.absoluteFill,
  image: { width: "100%", height: "100%" },
});

/**
 * Crossfades the two intro frames as a single beat of story:
 * intro-2 (holding the paper boat) dissolves into intro-1 (the boat lifting
 * off and sailing away). One-shot on mount — it settles on the "sent" frame,
 * never loops, to stay quiet and on-brand.
 */
export function BridgeIntroMascot() {
  // 0 = holding the boat (intro-2) · 1 = boat sailing away (intro-1)
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withDelay(2200, withTiming(1, { duration: 2600, easing: EASING })));
  }, [progress]);

  const holdingStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.get() }));
  const releasedStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));

  return (
    <View className="h-60 items-center">
      <Animated.View style={[styles.layer, holdingStyle]}>
        <Image
          source={require("@/assets/images/flux/intro-2.png")}
          style={styles.image}
          contentFit="contain"
        />
      </Animated.View>
      <Animated.View style={[styles.layer, releasedStyle]}>
        <Image
          source={require("@/assets/images/flux/intro-1.png")}
          style={styles.image}
          contentFit="contain"
        />
      </Animated.View>
    </View>
  );
}
