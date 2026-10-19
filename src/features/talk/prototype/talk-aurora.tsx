// PROTOTYPE (#584) — throwaway. The aurora-curtain shader from
// react-native-motion (apps/expo/components/animations/aurora-curtain), made
// transparent, tinted from the theme and fed the voice level: louder voice →
// brighter, longer rays. Time is never touched, so the 14 s loop stays seamless.
import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { useEffect } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import {
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useThemeColor } from "heroui-native";

const SKSL = `
uniform float2 u_res;
uniform float  u_t;
uniform float  u_pull;
uniform float  u_level;
uniform float  u_flip;
uniform float3 u_tint;
const float LAG = 0.2857;
const float FADE_A = -0.20;
const float FADE_B = 0.22;
const float FADE_P = 0.55;
const float TOP = 0.5;
const float EDGE_P = 1.6;
const float BOB_AMP = 0.01;
const float BREATHE_DEPTH = 0.88;
const float GAIN = 0.2664;
const float PULSE_DEPTH = 0.40;
const float BACKDROP = 0.0392;
float hash(float2 p) {
  return fract(sin(dot(p, float2(12.9898, 78.233))) * 43758.5453);
}
float breathe(float t, float speed, float phase, float depth) {
  float TAU = 6.2831853;
  float w = 0.5 + 0.5 * sin((t * speed + phase) * TAU);
  w = clamp(w + 0.25 * sin((t * (speed * 2.0 + 1.0) + phase * 3.1) * TAU), 0.0, 1.0);
  return (1.0 - depth) + depth * w;
}
float ray(float x, float ys, float td, float tw, float base, float halfWidth,
          float a1, float s1, float p1,
          float a2, float s2, float p2,
          float bobSpeed, float bobPhase,
          float brSpeed, float brPhase, float weight) {
  float TAU = 6.2831853;
  float swing = a1 * sin((td * s1 + p1) * TAU)
              + a2 * sin((td * s2 + p2) * TAU);
  float f = 1.0 - smoothstep(0.0, halfWidth, abs(x - (base + swing)));
  f = pow(f, EDGE_P);
  float yy = ys + BOB_AMP * sin((tw * bobSpeed + bobPhase) * TAU);
  float fade = pow(1.0 - smoothstep(FADE_A, FADE_B + 0.14 * u_level, yy), FADE_P);
  return f * fade * breathe(tw, brSpeed, brPhase, BREATHE_DEPTH) * weight;
}
half4 main(float2 fragCoord) {
  float TAU = 6.2831853;
  float x = fragCoord.x / u_res.x;
  float fy = mix(fragCoord.y, u_res.y - fragCoord.y, u_flip);
  float ys = fy / u_res.y - u_pull;
  float t = u_t;
  float tw = t
           + 0.012 * sin((t * 3.0 + 0.37) * TAU)
           + 0.006 * sin((t * 7.0 + 0.71) * TAU);
  float td = tw - ys * LAG;
  float v = 0.0;
  v += ray(x, ys, td, tw, 0.000, 0.300, 0.0665, 3.0, 0.00, 0.0266, 2.0, 0.20, 1.0, 0.00, 1.0, 0.00, 0.85);
  v += ray(x, ys, td, tw, 0.336, 0.210, 0.0546, 3.0, 0.37, 0.0315, 2.0, 0.62, 2.0, 0.35, 2.0, 0.17, 0.90);
  v += ray(x, ys, td, tw, 0.165, 0.435, 0.0735, 3.0, 0.68, 0.0224, 4.0, 0.15, 1.0, 0.70, 1.0, 0.33, 0.86);
  v += ray(x, ys, td, tw, 0.543, 0.255, 0.0595, 3.0, 0.15, 0.0287, 2.0, 0.85, 2.0, 0.10, 3.0, 0.50, 0.88);
  v += ray(x, ys, td, tw, 0.366, 0.375, 0.0630, 3.0, 0.52, 0.0252, 2.0, 0.40, 1.0, 0.45, 2.0, 0.67, 0.84);
  v += ray(x, ys, td, tw, 0.804, 0.165, 0.0504, 3.0, 0.83, 0.0336, 4.0, 0.70, 2.0, 0.80, 1.0, 0.83, 0.89);
  v += ray(x, ys, td, tw, 0.816, 0.345, 0.0700, 3.0, 0.26, 0.0238, 2.0, 0.05, 1.0, 0.20, 2.0, 0.42, 0.87);
  v += ray(x, ys, td, tw, 1.263, 0.225, 0.0574, 3.0, 0.60, 0.0301, 2.0, 0.95, 2.0, 0.55, 3.0, 0.92, 0.85);
  v += ray(x, ys, td, tw, 1.035, 0.405, 0.0616, 3.0, 0.44, 0.0259, 4.0, 0.28, 1.0, 0.90, 2.0, 0.08, 0.86);
  v *= smoothstep(-TOP, -TOP + 0.12, ys);
  v *= 1.0 + PULSE_DEPTH * sin(t * TAU);
  float v2 = v / (1.0 + v);
  float a = clamp(v2 * GAIN * (1.8 + 2.2 * u_level), 0.0, 1.0);
  float g = (1.0 - smoothstep(0.11, 0.28, ys))
          * smoothstep(-TOP, -TOP + 0.12, ys);
  a += (hash(floor(fragCoord / 0.5)) - 0.5) * 0.055 * (0.55 * g + 0.45 * v2);
  a = clamp(a, 0.0, 1.0);
  float m = 0.5 + 0.5 * sin((x * 1.5 + t) * TAU);
  float3 tint = mix(u_tint, mix(u_tint, float3(1.0), 0.35), m);
  return half4(tint * a, a);
}
`;

const SHADER = Skia.RuntimeEffect.Make(SKSL);

type Props = {
  level: SharedValue<number>;
  /** Rays hang from the top (0) or rise from the bottom (1). */
  flip?: 0 | 1;
  /** Fraction of the screen the canvas covers, anchored to its edge. */
  coverage?: number;
};

export function TalkAurora({ level, flip = 0, coverage = 1 }: Props) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const accent = useThemeColor("accent");
  const phase = useSharedValue(0.18);
  const smooth = useSharedValue(0);
  const h = height * coverage;
  const c = Skia.Color(accent);
  const tint = [c[0], c[1], c[2]];

  useEffect(() => {
    if (reduced) return;
    phase.set(0);
    phase.set(withRepeat(withTiming(1, { duration: 14000, easing: Easing.linear }), -1, false));
  }, [reduced, phase]);

  const uniforms = useDerivedValue(() => {
    smooth.set(smooth.get() + (level.get() - smooth.get()) * 0.12);
    return { u_res: [width, h], u_t: phase.get(), u_pull: 0, u_level: smooth.get(), u_flip: flip, u_tint: tint };
  });

  if (!SHADER) return null;
  return (
    <Canvas
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, flip ? { top: undefined, height: h } : { bottom: undefined, height: h }]}
    >
      <Fill>
        <Shader source={SHADER} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
