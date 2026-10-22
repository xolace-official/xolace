/**
 * One beat of the tale: chapter mark, the line, and the aside, laid out by
 * whichever bespoke composition its `kind` owns. Cardless by #198 — words on
 * the dark, with the fire behind them.
 *
 * The slide's own translate is deliberately slower than the list's (0.8x), so
 * the copy trails the swipe rather than moving locked to the finger.
 */
import type { ReactElement } from 'react';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';

import type { StoryBeat } from '@/src/features/onboarding/story-beats';
import { CoverBeat } from './cover-beat';
import { MirrorBeat } from './mirror-beat';
import { VentBeat } from './vent-beat';
import { XolacersBeat } from './xolacers-beat';
import { PlusBeat } from './plus-beat';
import { ProofBeat } from './proof-beat';

/** Every `kind` owns its own composition — no generic fallback. */
const BESPOKE: Record<StoryBeat['kind'], (p: { beat: StoryBeat }) => ReactElement> = {
  cover: CoverBeat,
  mirror: MirrorBeat,
  proof: ProofBeat,
  vent: VentBeat,
  xolacers: XolacersBeat,
  plus: PlusBeat,
};

export const StoryBeatSlide = ({
  beat,
  index,
  width,
  scrollX,
}: {
  beat: StoryBeat;
  index: number;
  width: number;
  scrollX: SharedValue<number>;
}) => {
  // Reduced motion keeps the crossfade (it explains which beat you're on) and
  // drops the trailing parallax, which is the part that reads as movement.
  const reduced = useReducedMotion();

  const rStyle = useAnimatedStyle(() => {
    const range = [width * (index - 1), width * index, width * (index + 1)];
    const opacity = interpolate(scrollX.get(), range, [0, 1, 0], Extrapolation.CLAMP);
    if (reduced) return { opacity, transform: [] };
    return {
      opacity,
      transform: [
        { translateY: interpolate(scrollX.get(), range, [22, 0, 22], Extrapolation.CLAMP) },
        {
          translateX: interpolate(
            scrollX.get(),
            range,
            [-width * 0.8, 0, width * 0.8],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  // KNOWN, ACCEPTED: every beat's `entering` fires at deck MOUNT, because the
  // six-item FlatList mounts all slides at once — so a beat reached 19s later
  // is reached with its choreography already finished. Gating the mount on
  // scroll position fixes that and was tried; it also leaves the whole deck
  // blank whenever `scrollX` and the list's real offset disagree (a Fast
  // Refresh with the deck parked off index 0 reproduces it every time). A
  // blank deck in the sign-up funnel is not a trade worth an unseen fade, and
  // every beat's FINAL state is complete on its own. Fix it by driving the
  // reveals off `scrollX` instead of `entering` — never by unmounting slides.

  // Beats that own their own composition still ride the deck's shared
  // parallax, so the swipe feels the same leaving them as on every other beat.
  const Bespoke = BESPOKE[beat.kind];
  return (
    <Animated.View style={[{ width }, rStyle]} className="flex-1">
      <Bespoke beat={beat} />
    </Animated.View>
  );
};
