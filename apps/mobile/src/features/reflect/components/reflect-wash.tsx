import { StyleSheet, useWindowDimensions } from "react-native";
import {
  Blur,
  Canvas,
  Fill,
  SweepGradient,
  vec,
} from "@shopify/react-native-skia";
import { useTokenColor } from "@/src/features/profile/hooks/use-token-color";
import { buildSweepStops } from "@/src/features/reflect/components/sweep-stops";

/** Themed sweep wash behind the reflect idle/typing canvas. */
export const ReflectWash = () => {
  const { width, height } = useWindowDimensions();
  const accent = useTokenColor("accent");
  const surface = useTokenColor("surface-secondary");
  const surfaceTertiary = useTokenColor("surface-tertiary");
  const background = useTokenColor("background");
  const colors = buildSweepStops({
    accent,
    surface,
    surfaceTertiary,
    background,
  });

  return (
    <Canvas style={[styles.canvas, { width, height }]} pointerEvents="none">
      <Fill>
        <SweepGradient c={vec(width / 2, height / 2)} colors={colors} />
        <Blur blur={55} />
      </Fill>
    </Canvas>
  );
};

const styles = StyleSheet.create({
  canvas: { position: "absolute", top: 0, left: 0 },
});
