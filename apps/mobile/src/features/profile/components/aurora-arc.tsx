import { StyleSheet, useWindowDimensions } from "react-native";
import { Canvas, Circle, RadialGradient, vec } from "@shopify/react-native-skia";
import { useTokenColor } from "@/src/features/profile/hooks/use-token-color";

type Props = { height?: number };

/**
 * Soft warm "aurora" sweep behind the profile hero.
 * Two overlapping radial gradients (ember + accent) that fade to
 * transparent — static, no animation. Sits absolutely at the top of
 * the screen, behind the transparent header and hero.
 */
export function AuroraArc({ height = 320 }: Props) {
  const { width } = useWindowDimensions();
  const ember = useTokenColor("ember");
  const accent = useTokenColor("accent");

  const emberCenter = vec(width * 0.5, height * 0.04);
  const accentCenter = vec(width * 0.18, 0);

  return (
    <Canvas style={[styles.canvas, { width, height }]} pointerEvents="none">
      <Circle c={accentCenter} r={width * 0.62}>
        <RadialGradient
          c={accentCenter}
          r={width * 0.62}
          colors={[accent + "24", accent + "00"]}
        />
      </Circle>
      <Circle c={emberCenter} r={width * 0.8}>
        <RadialGradient
          c={emberCenter}
          r={width * 0.8}
          colors={[ember + "3A", ember + "10", ember + "00"]}
        />
      </Circle>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: { position: "absolute", top: 0, left: 0 },
});
