/**
 * The proof beat — the deck's sixth bespoke composition, and the only one whose
 * subject is other people rather than the reader or the product.
 *
 */
import { useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { AppText } from '@/src/components/shared/app-text';
import type { StoryBeat } from '@/src/features/onboarding/story-beats';
import { useDeckColor } from './deck-color';
import { EmberField, VOICED } from './ember-field';

/**
 * `count` renders literally as embers, so it inherits Discovery's shipped rule
 * unchanged: real matches only, and below a floor of three there is no number
 * and no crowd to draw. The warm line runs alone in that case.
 *
 * ponytail: hardcoded until the real query lands — do not let the below-floor
 * branch ship as a fabricated field of embers.
 */
// TODO(#200): real weekly cohort count.
const COUNT = 22;

const REVIEW = {
  title: 'Slowly becoming my comfort app',
  quote:
    'I’ve always hated opening up to someone because I feel like I’d be laughed at or ignored. I also always assume I wouldn’t know where to start from if I’m to open up to someone. Just a few days on Xolace and I’ve realized that I don’t really need a lot of words to express myself.',
  author: 'RosieeeBD',
  source: 'App Store, May 2026',
};

/** Matches every other beat's cadence. */
const STEP = 95;
const DUR = 520;


const FIELD_MIN = 118;
const FIELD_MAX = 168;
/** Horizontal padding, doubled — px-9 on both sides. */
const GUTTER = 36 * 2;
/** Gap between the last ember and the top of the quote. */
const DROP = 18;

export const ProofBeat = ({ beat }: { beat: StoryBeat }) => {
  const ember = useDeckColor('ember');
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();

  const fieldW = width - GUTTER;
  // Proportional, not fixed: this is the tallest beat in the deck and a short
  // phone has to fit the quote and the caption under it without clipping.
  const fieldH = Math.min(FIELD_MAX, Math.max(FIELD_MIN, height * 0.17));

  // Where the speaking ember actually landed, in points — the rule and the
  // quote both hang off this, so the tether stays registered at every size.
  const voicedX = VOICED.x * fieldW;
  const voicedY = VOICED.y * fieldH;

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


      <View className="mt-6">
        <EmberField count={COUNT} color={ember} width={fieldW} height={fieldH} />

        {/* The rule. Starts at the ember's own centre and runs the whole way
            down the quote, so there is one continuous line from the light to
            the words. Faded at the top by sitting under the halo. */}
        <Animated.View
          entering={reduced ? undefined : FadeInDown.delay(1600).duration(700)}
          pointerEvents="none"
          className="absolute w-px rounded-full bottom-0"
          style={{
            left: voicedX,
            top: voicedY,
            backgroundColor: `${ember}4d`,
          }}
        />

        <Animated.View
          entering={reduced ? undefined : FadeInDown.delay(1700).duration(700)}
          style={{ paddingLeft: voicedX + 14, marginTop: DROP }}
          className="gap-1.5"
        >
          {/* The review's own title, kept as a title. It is the only place on
              this slide where someone says what Xolace became for them, and it
              is three words long — quoting it costs a line and buys the whole
              payoff the chosen sentence deliberately leaves out. */}
          <AppText className="text-foreground/90 text-[14px] leading-5 font-poppins-medium">
            {REVIEW.title}
          </AppText>

          {/* Set a step smaller than the deck's other body copy. Three
              sentences at 14px would run eleven lines and start reading as
              terms and conditions; at 12.5 it reads as what it is — someone
              typing more than they meant to. */}
          <AppText className="text-foreground/70 text-[12.5px] leading-4.75">
            {`“${REVIEW.quote}”`}
          </AppText>

          <AppText className="text-foreground/38 text-[11.5px] mt-0.5">
            {`${REVIEW.author} · ${REVIEW.source}`}
          </AppText>
        </Animated.View>
      </View>

      {/* The count arrives last and reads as a caption on a picture you have
          already looked at — the opposite order to a stat card, where the
          number arrives first and the visual decorates it. */}
      <Animated.View entering={enter(6)} className="mt-7">
        <AppText className="text-foreground/70 text-[14px] leading-6">
          <AppText className="font-poppins-medium" style={{ color: ember }}>{`${COUNT} people`}</AppText>
          {' sat by the fire this week — each one alone, none of them the only one.'}
        </AppText>
        <AppText className="text-foreground/38 text-[12px] leading-5 mt-1.5 pr-4">
          {beat.aside}
        </AppText>
      </Animated.View>
    </View>
  );
};
