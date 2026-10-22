import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const BACKDROP_COLORS: readonly [string, string, string] = [
  "rgba(245, 178, 124, 0.10)",
  "rgba(168, 132, 178, 0.06)",
  "rgba(54, 70, 110, 0.12)",
];
const BACKDROP_START = { x: 0, y: 0.5 };
const BACKDROP_END = { x: 1, y: 0.5 };

export const DuskDriftBackdrop = () => {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={BACKDROP_COLORS}
        start={BACKDROP_START}
        end={BACKDROP_END}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
};
