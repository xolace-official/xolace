// Liquid-glass card and tick gauge, ported from sample-codes/clarity-main
// (ui/glass-surface, session/tick-gauge) onto Xolace tokens (#491).
import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedProps,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Line } from "react-native-svg";
import { useAppTheme } from "@/src/context/app-theme-context";
import { useTokenColor } from "@/src/features/profile/hooks/use-token-color";

type SurfaceProps = { children?: ReactNode; radius?: number; className?: string; tint?: string };

/**
 * Frosted surface; `tint` is a token name washed faintly into the glass.
 * Never put it under an animated opacity — the blur stops rendering.
 */
export function GlassSurface({ children, radius = 32, className, tint }: SurfaceProps) {
  const surface = useTokenColor("surface");
  const tintColor = useTokenColor(tint ?? "surface");
  const { isDark } = useAppTheme();
  const shape: ViewStyle = { borderRadius: radius, borderCurve: "continuous", overflow: "hidden" };
  // GlassView is third-party, so Uniwind ignores a className on it; style the inside instead.
  const inner = <View className={className}>{children}</View>;
  if (!isLiquidGlassAvailable()) {
    return (
      <View style={[shape, { backgroundColor: surface + "CC" }]}>
        <View style={tint ? { backgroundColor: tintColor + "1A" } : undefined}>{inner}</View>
      </View>
    );
  }
  return (
    // Follow the app's theme, not the OS: the two can disagree.
    <GlassView
      glassEffectStyle="regular"
      colorScheme={isDark ? "dark" : "light"}
      tintColor={tint ? tintColor + "33" : undefined}
      style={[shape, { backgroundColor: surface + "40" }]}>
      {inner}
    </GlassView>
  );
}

const AnimatedLine = Animated.createAnimatedComponent(Line);

/** TickGauge's box. Room for the taller mark only when there is one, so the overall dial keeps its size. */
export const gaugeSize = (radius: number, tickWidth: number, tickLength: number, marked: boolean) =>
  radius * 2 + tickWidth + (marked ? tickLength * 0.5 : 0);

type GaugeProps = {
  ticks: number;
  /** Screen degrees: 0 = right, 90 = down. */
  startAngle: number;
  sweep: number;
  radius: number;
  tickLength: number;
  tickWidth: number;
  /** 0..1 */
  progress: SharedValue<number>;
  fill: string;
  track: string;
  /** 0..1 — the person's usual, drawn taller in --foreground. */
  mark?: number | null;
  children?: ReactNode;
};

export function TickGauge({ ticks, startAngle, sweep, radius, tickLength, tickWidth, progress, fill, track, mark, children }: GaugeProps) {
  const fg = useTokenColor("foreground");
  // Same scale as the fill: a usual equal to the value lands on the last lit tick.
  const markAt = mark != null ? Math.max(0, Math.round(mark * ticks) - 1) : -1;
  const size = gaugeSize(radius, tickWidth, tickLength, mark != null);
  const c = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {Array.from({ length: ticks }, (_, i) => {
          const a = ((startAngle + (sweep / (ticks - 1)) * i) * Math.PI) / 180;
          if (i === markAt) {
            const out = radius + tickLength * 0.25;
            return (
              <Line
                key={i} stroke={fg} strokeWidth={tickWidth} strokeLinecap="round"
                x1={c + Math.cos(a) * (radius - tickLength)} y1={c + Math.sin(a) * (radius - tickLength)}
                x2={c + Math.cos(a) * out} y2={c + Math.sin(a) * out}
              />
            );
          }
          return (
            <Tick
              key={i} i={i} n={ticks} progress={progress} fill={fill} track={track} width={tickWidth}
              x1={c + Math.cos(a) * (radius - tickLength)} y1={c + Math.sin(a) * (radius - tickLength)}
              x2={c + Math.cos(a) * radius} y2={c + Math.sin(a) * radius}
            />
          );
        })}
      </Svg>
      <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

type TickProps = {
  i: number; n: number; progress: SharedValue<number>; fill: string; track: string; width: number;
  x1: number; y1: number; x2: number; y2: number;
};

function Tick({ i, n, progress, fill, track, width, ...xy }: TickProps) {
  const animatedProps = useAnimatedProps(() => {
    const on = interpolate(progress.get() * n - i, [0, 1], [0, 1], Extrapolation.CLAMP);
    return { stroke: interpolateColor(on, [0, 1], [track, fill]) };
  });
  return <AnimatedLine {...xy} strokeWidth={width} strokeLinecap="round" animatedProps={animatedProps} />;
}
