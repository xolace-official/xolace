import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { STORY_BEATS } from '@/src/features/onboarding/story-beats';

/** Cool and nearly black. The base layer — never fades, so nothing shows through. */
const NIGHT = ['#070912', '#04050A', '#000000'] as const;
/** Indigo creeping up from the horizon, where the fire already is. */
const PREDAWN = ['#080A14', '#101528', '#1C1A2A'] as const;
/** Warm horizon meeting the fire. Cool above, so it still reads as sky. */
const DAWN = ['#141B33', '#3A3550', '#7A4A38'] as const;

/** Per-beat opacity. Index matches STORY_BEATS order. */
const PREDAWN_AT = [0, 0.12, 0.5, 0.85, 0.9, 0.55];
const DAWN_AT = [0, 0, 0.05, 0.25, 0.55, 1];

export const SkyArc = ({
  scrollX,
  width,
  dawnCeiling = 1,
}: {
  scrollX: SharedValue<number>;
  width: number;
  /** 1 = full sunrise (they're headed into a light app). Lower holds it at dusk. */
  dawnCeiling?: number;
}) => {
  // The looped list repeats beat 0 at the tail, so every ramp must return home.
  const stops = [...PREDAWN_AT.map((_, i) => width * i), width * STORY_BEATS.length];
  const predawn = [...PREDAWN_AT, PREDAWN_AT[0]];
  const dawn = [...DAWN_AT.map((v) => v * dawnCeiling), DAWN_AT[0]];

  const rPredawn = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.get(), stops, predawn, Extrapolation.CLAMP),
  }));

  const rDawn = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.get(), stops, dawn, Extrapolation.CLAMP),
  }));

  return (
    <>
      <LinearGradient colors={NIGHT} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, rPredawn]}>
        <LinearGradient colors={PREDAWN} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, rDawn]}>
        <LinearGradient colors={DAWN} locations={[0, 0.52, 1]} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </>
  );
};
