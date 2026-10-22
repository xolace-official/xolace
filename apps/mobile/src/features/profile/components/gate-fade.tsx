import { Canvas, LinearGradient, Rect, vec } from "@shopify/react-native-skia";

type Props = {
  width: number;
  height: number;
  /** Base frost color (resolved token hex, e.g. surface). */
  color: string;
  /** Alpha (2-hex) at the transparent edge. */
  startAlpha?: string;
  /** Alpha (2-hex) at the frosted edge. */
  endAlpha?: string;
  /** When true the opaque edge is the top instead of the bottom. */
  flip?: boolean;
};

/**
 * A vertical gradient "veil" that dissolves live content into a frosted edge —
 * no hard border, no hard cutoff. Mirrors the aurora-arc alpha-fade technique
 * (color + "XX" → color + "00"). Position it absolutely over the seam where a
 * readable region meets a gated one so the two blend instead of butting up.
 */
export function GateFade({
  width,
  height,
  color,
  startAlpha = "00",
  endAlpha = "F2",
  flip = false,
}: Props) {
  const start = vec(0, flip ? height : 0);
  const end = vec(0, flip ? 0 : height);

  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={start}
          end={end}
          colors={[color + startAlpha, color + endAlpha]}
        />
      </Rect>
    </Canvas>
  );
}
