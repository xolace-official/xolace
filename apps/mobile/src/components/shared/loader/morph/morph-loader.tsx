import React from "react";
import { StyleSheet } from "react-native";
import { Easing } from "react-native-reanimated";
import { useThemeColor } from "heroui-native";
import Loader from "../index";
import type { LoaderKeyframes } from "../types";

/**
 * Square that morphs to a circle and back across a full 360° rotation,
 * color-shifting between accent and foreground via keyframe interpolation.
 */
const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  block: { width: 44, height: 44 },
});

export const MorphLoader = () => {
  const accentColor = useThemeColor("accent");
  const foregroundColor = useThemeColor("foreground");

  const keyframes: LoaderKeyframes = {
    0: {
      borderRadius: 5,
      backgroundColor: accentColor,
      transform: [{ rotate: 0 }, { scale: 1 }],
    },
    50: {
      borderRadius: 26,
      backgroundColor: foregroundColor,
      transform: [{ rotate: 180 }, { scale: 0.8 }],
    },
    100: {
      borderRadius: 5,
      backgroundColor: accentColor,
      transform: [{ rotate: 360 }, { scale: 1 }],
    },
  };

  return (
    <Loader
      duration={2200}
      easing={Easing.inOut(Easing.ease)}
      style={styles.container}
    >
      <Loader.KeyframeView keyframes={keyframes} style={styles.block} />
    </Loader>
  );
};
