/**
 * The Xolace+ beat — the deck's fifth bespoke composition, and the only one
 * with a job outside the story: it has to sell, in a product that deliberately
 * refuses to put a paywall in front of anything.
 */
import { View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { AppText } from '@/src/components/shared/app-text';
import type { StoryBeat } from '@/src/features/onboarding/story-beats';
import { useDeckColor } from './deck-color';
import { PatternLine } from './pattern-line';


const EXTRAS = [
  { id: 'history', label: 'Full history', symbol: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' } },
  { id: 'look', label: 'Themes & avatars', symbol: { ios: 'paintpalette', android: 'palette', web: 'palette' } },
  { id: 'drafts', label: 'More drafts a day', symbol: { ios: 'square.and.pencil', android: 'edit_note', web: 'edit_note' } },
] as const;

/** Matches the cover, Mirror, Vent and Xolacers so all five share a cadence. */
const STEP = 95;
const DUR = 520;

export const PlusBeat = ({ beat }: { beat: StoryBeat }) => {
  const ember = useDeckColor('ember');
  const reduced = useReducedMotion();

  const enter = (index: number) =>
    reduced ? undefined : FadeInDown.delay(index * STEP).duration(DUR);

  return (
    <View className="flex-1 justify-center px-9 pb-10">
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

      <Animated.View entering={enter(3)} className="mt-4">
        <PatternLine />
      </Animated.View>

      <Animated.View entering={enter(4)} className="mt-2">
        <AppText className="text-foreground/30 text-[9.5px] uppercase mb-2.5 tracking-[1.8px]">
          Also with Plus
        </AppText>
        <View className="flex-row flex-wrap gap-2">
          {EXTRAS.map((extra) => (
            <View
              key={extra.id}
              className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
              style={{ borderColor: `${ember}2e` }}
            >
              <SymbolView name={extra.symbol} size={12} tintColor={ember} type="hierarchical" />
              <AppText className="text-foreground/70 text-[11.5px]">{extra.label}</AppText>
            </View>
          ))}
        </View>
      </Animated.View>

      {beat.tag ? (
        <Animated.View entering={enter(5)} className="mt-6 flex-row gap-3">
          <View className="w-0.5 rounded-full" style={{ backgroundColor: `${ember}59` }} />
          <AppText className="flex-1 text-foreground/65 text-[12.5px] leading-5">{beat.tag}</AppText>
        </Animated.View>
      ) : null}
    </View>
  );
};
