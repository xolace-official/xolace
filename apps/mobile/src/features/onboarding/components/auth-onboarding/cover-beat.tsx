/**
 * The opening title card — the one beat that is not a page of the tale but the
 * front of the book, so it deliberately breaks the deck's grid.
 *
 * This slide owns only its own composition. The fire, sky and scrims belong to
 * `HearthBackdrop` and are untouched here.
 */
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';

import { AppText } from '@/src/components/shared/app-text';
import type { StoryBeat } from '@/src/features/onboarding/story-beats';
import { useDeckColor } from './deck-color';

/** Staged so the card assembles rather than snapping in all at once. */
const STEP = 95;
const DUR = 520;

export const CoverBeat = ({ beat }: { beat: StoryBeat }) => {
  const ember = useDeckColor('ember');
  // The entrance is the first motion in the product. Reduced motion drops it
  // entirely — the card is fully legible without it.
  const reduced = useReducedMotion();
  const enter = (index: number) =>
    reduced ? undefined : FadeInDown.delay(index * STEP).duration(DUR);

  return (
    <View className="flex-1 px-9 pt-6">
      {/* Wordmark. The gateway slide is the only one that carries it. */}
      <Animated.View entering={enter(0)} className="flex-row items-center gap-2 mb-9">
        <SymbolView name={beat.symbol} size={16} tintColor={ember} type="hierarchical" />
        <AppText className="text-ember text-[11px] uppercase tracking-[3.4px] font-poppins-medium">
          Xolace
        </AppText>
      </Animated.View>

      <Animated.View entering={enter(1)}>
        <AppText className="text-foreground text-[34px] leading-11.5 font-poppins-medium">
          {beat.beat}
        </AppText>
      </Animated.View>

      {/* The horizon line — short, ember, sits on the same left axis as
          everything else. It is what makes the block read as composed rather
          than as two paragraphs that happen to be stacked. */}
      <Animated.View
        entering={enter(2)}
        className="h-px w-9 bg-ember/60 mt-7 mb-6"
      />

      <Animated.View entering={enter(3)}>
        <AppText className="text-foreground/55 text-[14.5px] leading-5.75 pr-2">
          {beat.aside}
        </AppText>
      </Animated.View>

      {/* Floor. The figure sits on the real fire rather than beside a drawn one. */}
      <View className="flex-1 min-h-6" />

      <Animated.View
        entering={reduced ? undefined : FadeIn.delay(4 * STEP).duration(700)}
        pointerEvents="none"
        className="items-center"
      >
        {/* Sized and dropped to the floor so the figure's own drawn fire lands
            in the band where the real footage is still bright, rather than
            floating in the dark gap above it. */}
        <Image
          source={require('@/assets/images/flux/flux-campfire.png')}
          style={styles.figure}
          contentFit="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  figure: { width: 186, height: 248 },
});
