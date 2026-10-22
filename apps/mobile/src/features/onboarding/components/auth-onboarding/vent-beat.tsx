import { useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';

import { AppText } from '@/src/components/shared/app-text';
import type { StoryBeat } from '@/src/features/onboarding/story-beats';
import { useDeckColor } from './deck-color';
import { deckFigureHeight, VENT_SCALE_MATCH } from './figure-metrics';
import { VentSparks } from './vent-sparks';

const FIGURE = require('@/assets/images/flux/vent-bg.png');

const SRC_W = 562;
const SRC_H = 883;
const ASPECT = SRC_W / SRC_H;

/**
 * Where the plume starts, as a fraction of the source frame.
 *
 * X is the open mouth. Y is NOT — it sits just above the head's silhouette at
 * that x, and this is a device finding rather than a preference: an ember-
 * coloured spark drawn over the character's own peach-lit face is invisible.
 * Started at the mouth, the first ~100pt of every spark's climb was spent
 * crossing the head, so the only ones that ever showed against the dark were
 * the ones that had already faded out. Starting clear of the silhouette puts
 * the whole plume on the background it was drawn to be seen against, and it
 * still reads as breath — it leaves from directly above the mouth.
 *
 * Both move with the asset if the pose is ever re-rendered.
 */
const PLUME_X = 0.632;
const PLUME_Y = 0.09;

/** Left inset of the figure inside the slide's own padding, and the clearance
 *  kept under it so the character never touches the pagination row. */
const FIGURE_INSET = 4;
const FIGURE_FLOOR = 12;

/** Matches the cover and the Mirror so all three bespoke slides share a cadence. */
const STEP = 95;
const DUR = 520;
/** The breath starts after the character has settled, never with it. */
const BREATH_IN = 520;

export const VentBeat = ({ beat }: { beat: StoryBeat }) => {
  const ember = useDeckColor('ember');
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();

  const figH = deckFigureHeight(height) * VENT_SCALE_MATCH;
  const figW = figH * ASPECT;

  // Both measured from the slide's content box, matching the bottom-anchored
  // figure, so the plume stays with the character at every screen size.
  const plumeX = FIGURE_INSET + PLUME_X * figW;
  const plumeBottom = FIGURE_FLOOR + (1 - PLUME_Y) * figH;

  const enter = (index: number) =>
    reduced ? undefined : FadeInDown.delay(index * STEP).duration(DUR);

  return (
    <View className="flex-1 px-9 pt-6">
      <Animated.View entering={enter(0)} className="flex-row items-center gap-2.5 mb-6">
        <SymbolView name={beat.symbol} size={15} tintColor={ember} type="hierarchical" />
        <AppText className="text-ember/75 text-[10.5px] uppercase tracking-[2.2px]">
          {beat.label}
        </AppText>
      </Animated.View>

      <Animated.View entering={enter(1)}>
        <AppText className="text-foreground/95 text-[32px] leading-11.25 font-poppins-medium">
          {beat.beat}
        </AppText>
      </Animated.View>

      <Animated.View entering={enter(2)}>
        <AppText className="text-foreground/42 text-[14px] leading-6 mt-5 pr-4">
          {beat.aside}
        </AppText>
      </Animated.View>

      {beat.tag ? (
        <Animated.View entering={enter(3)}>
          <AppText className="text-ember/75 text-[10.5px] uppercase mt-4 tracking-[2px]">
            {beat.tag}
          </AppText>
        </Animated.View>
      ) : null}

      <View className="flex-1 min-h-3" />

      <Animated.View
        entering={enter(4)}
        pointerEvents="none"
        className="items-start"
        style={{ paddingLeft: FIGURE_INSET, paddingBottom: FIGURE_FLOOR }}
      >
        <Image source={FIGURE} style={{ width: figW, height: figH }} contentFit="contain" />
      </Animated.View>

      <Animated.View
        entering={reduced ? undefined : FadeIn.delay(4 * STEP + BREATH_IN).duration(900)}
        pointerEvents="none"
        className="absolute inset-0"
      >
        <VentSparks
          originX={plumeX}
          originBottom={plumeBottom}
          color={ember}
          reduced={reduced}
        />
      </Animated.View>
    </View>
  );
};
