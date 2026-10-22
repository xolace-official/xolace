import React from "react";
import { StyleSheet } from "react-native";
import { Easing } from "react-native-reanimated";
import { useThemeColor } from "heroui-native";
import Loader from "../index";
import type { LoaderKeyframes } from "../types";

const SQUISH_KEYFRAMES: LoaderKeyframes = {
  0: { transform: [{ translateY: 0 }, { scaleX: 1 }, { scaleY: 1 }] },
  30: { transform: [{ translateY: -20 }, { scaleX: 0.88 }, { scaleY: 1.18 }] },
  60: { transform: [{ translateY: 0 }, { scaleX: 1.38 }, { scaleY: 0.68 }] },
  75: { transform: [{ translateY: -6 }, { scaleX: 0.9 }, { scaleY: 1.06 }] },
  90: { transform: [{ translateY: 0 }, { scaleX: 1.12 }, { scaleY: 0.94 }] },
  100: { transform: [{ translateY: 0 }, { scaleX: 1 }, { scaleY: 1 }] },
};

/** Squash-and-stretch bounce block — physical, snappy, full secondary motion. */
const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  block: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
});

export const SquishLoader = () => {
  const accentColor = useThemeColor("accent");

  const blockStyle = [styles.block, { backgroundColor: accentColor }];

  return (
    <Loader
      duration={1100}
      easing={Easing.out(Easing.ease)}
      style={styles.container}
    >
      <Loader.KeyframeView keyframes={SQUISH_KEYFRAMES} style={blockStyle} />
    </Loader>
  );
};
