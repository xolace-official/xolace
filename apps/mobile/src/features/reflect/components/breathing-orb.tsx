import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
  FadeIn,
} from "react-native-reanimated";
import { useThemeColor } from "heroui-native";

const HALO_SIZE = 240;
const CORE_SIZE = 150;

const BreathingOrbComponent = () => {
  const accentColor = useThemeColor("accent");
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const coreOpacity = useSharedValue(0.4);
  const haloOpacity = useSharedValue(0.08);

  useEffect(() => {
    if (reduceMotion) {
      scale.set(1.15);
      coreOpacity.set(0.6);
      haloOpacity.set(0.12);
      return;
    }

    scale.set(withRepeat(
      withTiming(1.3, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    ));
    coreOpacity.set(withRepeat(
      withTiming(0.8, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    ));
    haloOpacity.set(withRepeat(
      withTiming(0.15, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    ));

    return () => {
      cancelAnimation(scale);
      cancelAnimation(coreOpacity);
      cancelAnimation(haloOpacity);
    };
  }, [scale, coreOpacity, haloOpacity, reduceMotion]);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    position: "absolute",
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    backgroundColor: accentColor,
    opacity: haloOpacity.get(),
  }));

  const coreStyle = useAnimatedStyle(() => ({
    width: CORE_SIZE,
    height: CORE_SIZE,
    borderRadius: CORE_SIZE / 2,
    backgroundColor: accentColor,
    opacity: coreOpacity.get(),
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(800).delay(300)}
      className="items-center justify-center"
    >
      <Animated.View style={breathStyle}>
        <View style={styles.orbContainer}>
          <Animated.View style={haloStyle} />
          <Animated.View style={coreStyle} />
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export const BreathingOrb = BreathingOrbComponent;

const styles = StyleSheet.create({
  orbContainer: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
});
