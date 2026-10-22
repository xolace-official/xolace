import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { api } from '@/convex/_generated/api';
import { AppText } from '@/src/components/shared/app-text';
import { TextAnimation } from '@/src/components/ui/text-animation';
import { useEffectiveReducedMotion } from '@/src/lib/motion/use-effective-reduced-motion';
import { FluxStage, MOUTH_Y } from './flux-stage';

const FLUX_W = 53;
const FLUX_H = 104;
/** Drops his feet below the bubble's baseline so he stands, not floats. */
const FLUX_TOP = 8;
const TAIL = 12;

const WORD_MS = 62;
/** Held after a comma or full stop. Without it, 62ms/word reads as a ticker. */
const BREATH_MS = 200;
/** How long a word takes to come up once it's his turn to say it. */
const FADE_MS = 90;
/** How long a bubble takes to arrive. Words wait for it to land. */
const BUBBLE_MS = 420;
/** Lead-in before he starts talking, and the pause between the two beats. */
const OPENING_MS = BUBBLE_MS - 100;
/**
 * The pause between the two beats. The whole card is this pause — said in one
 * breath, "campers sat with this" and "you are not alone" is a statistic.
 */
const BEAT_MS = 900;
/**
 * A bubble lands with a bounce — it was thrown from his mouth, not faded up.
 * 0.55 is the overshoot that reads as spoken; anything past ~0.8 arrives dead.
 */
const BUBBLE_SPRING = { duration: BUBBLE_MS, dampingRatio: 0.55 } as const;
/**
 * The closer is the one people watch, because the pause told them to. It gets
 * a slower spring, a looser one, and further to travel — an overshoot is only
 * visible in proportion to the distance it overshoots.
 */
const CLOSER_SPRING = { duration: 560, dampingRatio: 0.45 } as const;
const CLOSER_TRAVEL = 22;

const styles = StyleSheet.create({
  bubble: { borderCurve: 'continuous' },
  // The tail is the bubble's own corner, rotated 45° and tucked behind its left
  // edge — so it inherits the fill and border without a second color. Its top
  // is his mouth, which sits lower than instinct says: his head is most of him.
  tail: {
    position: 'absolute',
    left: -5,
    top: FLUX_TOP + FLUX_H * MOUTH_Y - TAIL / 2,
    width: TAIL,
    height: TAIL,
    transform: [{ rotate: '45deg' }],
  },
  flux: { marginTop: FLUX_TOP },
});

/* ---------------------------------------------------------------- helpers */

/** Cumulative start time per word, with a beat held at punctuation. */
function wordOffsets(words: string[]) {
  let t = 0;
  return words.map((w) => {
    const at = t;
    t += WORD_MS + (/[,.]$/.test(w) ? BREATH_MS : 0);
    return at;
  });
}

const spokenMs = (text: string) => {
  const o = wordOffsets(text.split(' '));
  return o[o.length - 1] + WORD_MS;
};

/**
 * Reveals a sentence word by word — Flux is speaking it, not printing it.
 *
 * Every word is laid out from the first frame and only its opacity moves, off
 * one shared clock on the UI thread. The obvious version — slicing the string
 * as a counter goes up — is a React render *and* a fresh text measurement per
 * word, and on a cold start the JS thread is contended enough that those land
 * late and clumped, which is the stutter this replaces. It also means the
 * bubble is its final size immediately instead of growing a line at a time.
 */
function useSpokenClock(total: number, reduced: boolean) {
  // The last word starts at total - WORD_MS and fades for FADE_MS, which
  // outruns a clock that stops at total — it would land short of full opacity.
  const end = total + FADE_MS;
  const clock = useSharedValue(reduced ? end : 0);

  useEffect(() => {
    if (reduced) {
      clock.set(end);
      return;
    }
    clock.set(0);
    clock.set(withDelay(OPENING_MS, withTiming(end, { duration: end, easing: Easing.linear })));
  }, [clock, reduced, end]);

  return clock;
}

/** One word, lit when the clock reaches the moment he says it. */
function SpokenWord({ clock, at, children }: { clock: SharedValue<number>; at: number; children: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(clock.get(), [at, at + FADE_MS], [0, 1], 'clamp'),
  }));
  return <Animated.Text style={style}>{children}</Animated.Text>;
}

/** Bubbles arrive from the tail, not by fading in place. */
function useBubbleIn(
  delay: number,
  reduced: boolean,
  spring: { duration: number; dampingRatio: number } = BUBBLE_SPRING,
  travel = 10
) {
  const p = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      p.set(1);
      return;
    }
    p.set(withDelay(delay, withSpring(1, spring)));
  }, [delay, reduced, p, spring]);

  return useAnimatedStyle(() => ({
    // Opacity is clamped and the transforms are not: the bubble must not flash
    // brighter than solid on the overshoot, but it should visibly travel past
    // where it lands and come back. That overshoot is the whole spring.
    opacity: Math.min(p.get(), 1),
    transform: [
      { translateX: (1 - p.get()) * -travel },
      { scale: 0.86 + p.get() * 0.14 },
    ],
  }));
}

/* ------------------------------------------------------------------- card */

/**
 * Once a week, a real number of other campers who carried what the viewer last
 * carried. Flux says it — this is the app speaking to you, not a stat readout —
 * which is why it's a speech bubble and not a metric tile.
 *
 * He delivers it in two beats: the fact, then a pause, then "You are not
 * alone." The pause is the whole point; said in one breath it's a statistic.
 *
 * Deliberately inert: no onPress, no destination. It's a moment of "you are not
 * alone," not an entry point to a feed that doesn't exist.
 *
 * Renders nothing until there's something honest to say (see convex/cohort.ts).
 */
export function CohortCard() {
  const card = useQuery(api.cohort.getWeeklyCohortCard);
  const reduced = useEffectiveReducedMotion();

  if (!card || card.status === 'hidden') return null;

  /*
   * The speech is a separate component so every timer and spring in it starts
   * when the card actually appears. Run in here, they start at mount — which on
   * a cold start is while the query is still in flight, so both bubbles finish
   * springing in unseen and snap into place fully formed the instant the data
   * lands, with the words only then beginning to arrive behind them.
   */
  return <CohortSpeech card={card} reduced={reduced} />;
}

type Card = FunctionReturnType<typeof api.cohort.getWeeklyCohortCard>;

function CohortSpeech({ card, reduced }: { card: Exclude<Card, { status: 'hidden' }>; reduced: boolean }) {
  const emotion = card.emotion.replace(/-/g, ' ');
  const fact =
    card.status === 'count'
      ? `campers sat with ${emotion} by the fire this week.`
      : `Others have sat with ${emotion} by this fire too.`;
  const closer = 'You are not alone.';

  const words = fact.split(' ');
  const offsets = wordOffsets(words);
  const said = spokenMs(fact);
  const bubble1 = useBubbleIn(0, reduced);
  const bubble2 = useBubbleIn(OPENING_MS + said + BEAT_MS, reduced, CLOSER_SPRING, CLOSER_TRAVEL);
  const clock = useSpokenClock(said, reduced);

  return (
    <View
      className="flex-row gap-1"
      accessibilityRole="text"
      accessibilityLabel={`${card.status === 'count' ? `${card.count} ` : ''}${fact} ${closer}`}
      accessible
    >
      <View style={styles.flux}>
        <FluxStage w={FLUX_W} h={FLUX_H} reduced={reduced} />
      </View>

      <View className="flex-1 gap-2">
        <Animated.View style={bubble1}>
          <View className="rounded-3xl border border-border/65 bg-surface" style={styles.bubble}>
            <View className="border-b border-l border-border/65 bg-surface" style={styles.tail} />
            <AppText className="px-4 py-4 text-[15px] leading-6 text-foreground">
              {/* The count lands with the last word of the sentence he says it
               * in — a number still ticking under the next bubble reads as two
               * things happening rather than one thing being said. */}
              {card.status === 'count' && (
                <>
                  <TextAnimation.Counting
                    value={card.count}
                    duration={said}
                    delay={OPENING_MS}
                    enabled={!reduced}
                    weight="semibold"
                    className="text-[15px] leading-6 text-ember"
                  />
                  <AppText> </AppText>
                </>
              )}
              {/* Keyed by the moment it's spoken: offsets strictly increase,
                * so it identifies a position in a sentence that repeats words. */}
              {words.map((word, i) => (
                <SpokenWord key={offsets[i]} clock={clock} at={offsets[i]}>
                  {i === words.length - 1 ? word : `${word} `}
                </SpokenWord>
              ))}
            </AppText>
          </View>
        </Animated.View>

        {/* No tail on the closer — one from here would cross the bubble above.
         * It reads as an aside, which is what the pause set it up to be. */}
        <Animated.View style={bubble2} className="self-start">
          <View
            className="rounded-3xl border border-border/60 bg-surface px-4 py-2.5"
            style={styles.bubble}
          >
            <AppText className="text-[14px] leading-5 text-muted">{closer}</AppText>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
