/**
 * The Xolacers beat — the deck's fourth bespoke composition, and the only one
 * where a second person is present.
 *
 *     ◇ XOLACERS
 *     the line
 *     the aside
 *     TRAINED PEERS · NOT THERAPISTS
 *
 *          [figure, mask in hand]        ·   ← their ember, at eye height
 *                    ↑ warmth arrives on the face, after the ember does
 *
 * THE MASK STAYS IN THE HAND. It would have been easy to fade it out and call
 * that the transformation — and it would have said the opposite of the beat.
 * The promise here is that you can stop performing WITHOUT being identified:
 * the mask comes down, but you keep hold of it. The asset is used exactly as
 * drawn for that reason; nothing is animated off the character.
 *
 * THE ORDER IS THE MEANING. Their ember arrives first, the warmth on the face
 * lands ~420ms later. That gap is the whole slide: it is cause and effect, not
 * two things fading in. Play them together and it reads as a lighting choice.
 *
 * WHY THE CHARACTER IS CENTRED. Mirror pushes its figure right of the text
 * axis, Vent pushes it left; that flip is what tells you those two are
 * alternatives rather than steps (see the pair note in `story-beats.ts`). This
 * beat must not join that argument, so it sits on the axis and lets the empty
 * quadrant to its right belong to somebody else.
 *
 * The fire, sky and scrims belong to `HearthBackdrop` and are untouched here.
 */
import { useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';

import { AppText } from '@/src/components/shared/app-text';
import type { StoryBeat } from '@/src/features/onboarding/story-beats';
import { CompanionEmber } from './companion-ember';
import { useDeckColor } from './deck-color';
import { EmberGlow } from './ember-glow';
import { deckFigureHeight, XOLACERS_SCALE } from './figure-metrics';

const FIGURE = require('@/assets/images/flux/flux-sad.png');

const SRC_W = 635;
const SRC_H = 1054;
const ASPECT = SRC_W / SRC_H;

/**
 * The face, as a fraction of the source frame — measured off the asset, not
 * chosen. Both the warmth on the character and the companion's eye-height are
 * hung off this, so a re-rendered pose only needs these two numbers changed.
 */
const FACE_X = 0.44;
const FACE_Y = 0.35;
/** Wide enough to spill past the head, so it reads as light falling on the
 *  character rather than as a disc parked on its face. */
const FACE_GLOW = 0.95;
/**
 * The warmth is pushed off the face toward the companion, because light has a
 * direction and theirs is the only source on this slide. Centred, it reads as
 * the character glowing on its own — which is the one thing the beat is not
 * saying. Small number, but it is the difference between "lit by someone" and
 * "lit from within".
 */
const LIGHT_BIAS = 0.13;

/** How far the ember wash carries the grey figure toward the deck's palette.
 *  Above ~0.4 the sculpt flattens into a silhouette; below ~0.25 the character
 *  still reads as stone next to the peach one on the beat before it. */
const WASH_ALPHA = 0.32;

/** Clearance kept under the figure so it never touches the pagination row. */
const FIGURE_FLOOR = 12;
/** Nudged off dead centre to open the right quadrant for the companion. */
const FIGURE_NUDGE = 40;

const COMPANION = 78;
/** Held off the right edge — an ember flush to the frame reads as a crop. */
const COMPANION_RIGHT = 6;

/** Matches the cover, the Mirror and Vent so all four share a cadence. */
const STEP = 95;
const DUR = 520;
/** After the character settles, someone sits down across from it. */
const ARRIVE = 560;
/** And only then does their light reach the face. */
const WARMTH = 420;

export const XolacersBeat = ({ beat }: { beat: StoryBeat }) => {
  const ember = useDeckColor('ember');
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();

  const figH = deckFigureHeight(height) * XOLACERS_SCALE;
  const figW = figH * ASPECT;

  const faceGlow = figW * FACE_GLOW;
  // Their ember sits at the character's eye height, measured from the same
  // floor the figure is anchored to, so the two stay level at every size.
  const companionBottom = FIGURE_FLOOR + figH * (1 - FACE_Y) - COMPANION / 2;

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
        className="items-center"
        style={{ paddingRight: FIGURE_NUDGE, paddingBottom: FIGURE_FLOOR }}
      >
        <View style={{ width: figW, height: figH }}>
          <Image source={FIGURE} style={{ width: figW, height: figH }} contentFit="contain" />
          <Animated.View
            entering={
              reduced ? undefined : FadeIn.delay(4 * STEP + ARRIVE + WARMTH).duration(1000)
            }
            pointerEvents="none"
            className="absolute"
          >
            <Image
              source={FIGURE}
              tintColor={ember}
              style={{ width: figW, height: figH, opacity: WASH_ALPHA }}
              contentFit="contain"
            />
          </Animated.View>

          <Animated.View
            entering={
              reduced ? undefined : FadeIn.delay(4 * STEP + ARRIVE + WARMTH).duration(900)
            }
            pointerEvents="none"
            className="absolute"
            style={{
              left: (FACE_X + LIGHT_BIAS) * figW - faceGlow / 2,
              top: FACE_Y * figH - faceGlow / 2,
            }}
          >
            <EmberGlow id="xolacer-face" size={faceGlow} color={ember} opacity={0.5} />
          </Animated.View>
        </View>
      </Animated.View>

      <Animated.View
        entering={reduced ? undefined : FadeIn.delay(4 * STEP + ARRIVE).duration(1100)}
        pointerEvents="none"
        className="absolute"
        style={{ right: COMPANION_RIGHT, bottom: companionBottom }}
      >
        <CompanionEmber color={ember} reduced={reduced} size={COMPANION} />
      </Animated.View>
    </View>
  );
};
