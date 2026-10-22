/**
 * For you as a centre-focus carousel (#396, from the opal sample): cards snap
 * to centre; away from it they shrink to 0.88 and blur (iOS BlurView, up to
 * 15). One scroll value on the UI thread drives both; transforms only.
 * Reduced motion (the app's `motionPreference`): a plain snapping row.
 */
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { CARD_RADIUS, type EntryItem, PhotoCard } from '@/src/features/library/home/entry-cards';
import { useEffectiveReducedMotion } from '@/src/lib/motion/use-effective-reduced-motion';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const GAP = 10;
const HEIGHT = 340;

type Item = { entry: EntryItem; kicker: string };

type CardProps = { item: Item; index: number; scrollX: SharedValue<number>; itemW: number; reduced: boolean };

function Card({ item, index, scrollX, itemW, reduced }: CardProps) {
  // With centring padding, card i is centred exactly at scrollX = i * step.
  const step = itemW + GAP;
  const style = useAnimatedStyle(() => {
    if (reduced) return { transform: [{ scale: 1 }] };
    const d = Math.abs(scrollX.get() - index * step) / step;
    return { transform: [{ scale: interpolate(d, [0, 0.15, 1], [1, 1, 0.88], Extrapolation.CLAMP) }] };
  });
  const blurProps = useAnimatedProps(() => {
    if (reduced) return { intensity: 0 };
    const d = Math.abs(scrollX.get() - index * step) / step;
    return { intensity: interpolate(d, [0, 0.15, 1], [0, 0, 15], Extrapolation.CLAMP) };
  });

  return (
    <Animated.View style={[{ width: itemW }, style]}>
      <PhotoCard entry={item.entry} kicker={item.kicker} width={itemW} height={HEIGHT} />
      {Platform.OS === 'ios' && (
        // Dark tint on purpose: it frosts the cover photo, a fixed palette (CLAUDE.md).
        <AnimatedBlurView
          animatedProps={blurProps}
          pointerEvents="none"
          tint="systemThinMaterialDark"
          style={[StyleSheet.absoluteFill, { borderRadius: CARD_RADIUS, overflow: 'hidden' }]}
        />
      )}
    </Animated.View>
  );
}

export function ForYouCarousel({ items }: { items: Item[] }) {
  const { width } = useWindowDimensions();
  const itemW = Math.round(width * 0.7);
  const scrollX = useSharedValue(0);
  const reduced = useEffectiveReducedMotion();
  const onScroll = useAnimatedScrollHandler((e) => scrollX.set(e.contentOffset.x));

  return (
    <Animated.ScrollView
      horizontal
      onScroll={onScroll}
      scrollEventThrottle={16}
      snapToInterval={itemW + GAP}
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: (width - itemW) / 2, gap: GAP }}
    >
      {items.map((item, i) => (
        <Card key={item.entry._id} item={item} index={i} scrollX={scrollX} itemW={itemW} reduced={reduced} />
      ))}
    </Animated.ScrollView>
  );
}
