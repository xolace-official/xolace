import { useEffect } from 'react';
import { View } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SFSymbol, SymbolView } from 'expo-symbols';

type Props = {
  name: { ios: SFSymbol; android: string };
  size: number;
  /** Resolved accent hex (from useThemeColor) — drives both icon tint and halo. */
  color: string;
};

/**
 * "Lit" icon for a newly added menu item: accent-tinted with a soft halo
 * behind it that slowly breathes — a light left on for you, not a badge.
 * The parent swaps back to the plain dimmed icon once the item is opened.
 */
export function GlowIcon({ name, size, color }: Props) {
  const breath = useSharedValue(0.4);
  // Off-screen it would keep committing every frame under the pushed screen.
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) {
      cancelAnimation(breath);
      return;
    }
    breath.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.4, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [breath, isFocused]);

  const haloStyle = useAnimatedStyle(() => ({ opacity: breath.get() }));

  const halo = size * 1.9;

  return (
    <View className="items-center justify-center">
      <Animated.View
        pointerEvents="none"
        className="absolute"
        style={[
          haloStyle,
          {
            width: halo,
            height: halo,
            borderRadius: halo / 2,
            backgroundColor: `${color}26`,
            boxShadow: `0 0 ${size}px ${color}59`,
          },
        ]}
      />
      <SymbolView name={name as any} size={size} tintColor={color} />
    </View>
  );
}
