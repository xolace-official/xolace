/**
 * The other person on the Xolacers beat: one small ember across the dark, at
 * the character's eye height.
 *
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { EmberGlow } from './ember-glow';

/** Slower than a resting breath. Anything quicker reads as a notification. */
const PULSE_MS = 2600;
const DIM = 0.58;

export const CompanionEmber = ({
  color,
  reduced,
  size = 78,
}: {
  color: string;
  reduced: boolean;
  /** Halo diameter. The lit core is a fixed 5pt regardless. */
  size?: number;
}) => {
  const pulse = useSharedValue(reduced ? 1 : DIM);

  useEffect(() => {
    // Also cancels a running pulse when `reduced` flips on mid-life.
    pulse.set(reduced ? 1 : DIM);
    if (reduced) return;
    pulse.set(
      withRepeat(
        withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      ),
    );
  }, [reduced, pulse]);

  const rStyle = useAnimatedStyle(() => ({ opacity: pulse.get() }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ width: size, height: size }, rStyle]}
      className="items-center justify-center"
    >
      <View className="absolute inset-0">
        <EmberGlow id="xolacer-companion" size={size} color={color} opacity={0.42} />
      </View>
      <View
        className="rounded-full w-1.25 h-1.25"
        style={{ backgroundColor: color }}
      />
    </Animated.View>
  );
};
