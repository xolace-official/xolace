import React from "react";
import { View, StyleSheet } from "react-native";
import { Easing } from "react-native-reanimated";
import { useThemeColor } from "heroui-native";
import Loader from "../index";
import type { LoaderKeyframes } from "../types";

const RING_KEYFRAMES: LoaderKeyframes = {
  0: { opacity: 0.75, transform: [{ scale: 0.25 }] },
  100: { opacity: 0, transform: [{ scale: 1.5 }] },
};

const DELAYS = [0, 550, 1100];

const RIPPLE_SIZE = 80;
const RING_RADIUS = RIPPLE_SIZE / 2;

const styles = StyleSheet.create({
  container: { width: RIPPLE_SIZE, height: RIPPLE_SIZE },
  loader: {
    position: "absolute",
    top: 0,
    left: 0,
    width: RIPPLE_SIZE,
    height: RIPPLE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    width: RIPPLE_SIZE,
    height: RIPPLE_SIZE,
    borderRadius: RING_RADIUS,
    borderWidth: 1.5,
  },
});

/** Three concentric rings that expand outward like ripples, staggered 550ms apart. */
export const RippleLoader = () => {
  const accentColor = useThemeColor("accent");

  const ringStyle = [styles.ring, { borderColor: accentColor }];

  return (
    <View style={styles.container}>
      {DELAYS.map((delay) => (
        <Loader
          key={delay}
          duration={1800}
          initialDelay={delay}
          easing={Easing.out(Easing.ease)}
          style={styles.loader}
        >
          <Loader.KeyframeView keyframes={RING_KEYFRAMES} style={ringStyle} />
        </Loader>
      ))}
    </View>
  );
};
