import { memo } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useEffectiveReducedMotion } from '@/src/lib/motion/use-effective-reduced-motion';

import { FounderCard } from './founder-card';
import { FOUNDER_MARQUEE_CARDS } from './marquee-data';
import {
  beltSlots,
  slotLeft,
  CARD_HEIGHT,
  CARD_STRIDE,
  CARD_WIDTH,
} from './marquee-geometry';

// Horizontal auto-drift belt with pan-to-nudge — the same mechanic as the
// onboarding MoodMarquee (useFrameCallback + per-item modulo positioning), but
// the cards are Skia-clipped silhouettes rather than plain rounded rects. The
// two belts are deliberately not shared: MoodMarquee centres its track and hands
// its offset up for background parallax, which this band has no use for.
//
// Motion budget: drift is the whole point of the band, so reduced motion stops
// the drift rather than the screen — the belt still pans by hand.

const AUTO_SPEED = 16; // px/s
const ROTATIONS = [-4, 3, -2, 4, -3];

type Props = {
  /** Width of the visible track. */
  viewport: number;
};

const FounderMarqueeComponent = ({ viewport }: Props) => {
  'use no memo';
  const reducedMotion = useEffectiveReducedMotion();
  const restSpeed = reducedMotion ? 0 : AUTO_SPEED;
  const offset = useSharedValue(0);
  const speed = useSharedValue(restSpeed);

  // Wide screens (tablets, unfolded foldables) get extra slots so the belt is
  // always wider than the track; the card set repeats to fill them.
  const slots = beltSlots(viewport, FOUNDER_MARQUEE_CARDS.length);
  const beltWidth = slots * CARD_STRIDE;

  useFrameCallback((frame) => {
    const dt = (frame?.timeSincePreviousFrame ?? 0) / 1000;
    offset.set(offset.get() + speed.get() * dt);
  });

  const pan = Gesture.Pan()
    .onBegin(() => speed.set(0))
    .onChange((e) => offset.set(offset.get() - e.changeX))
    .onFinalize((e) => {
      speed.set(-e.velocityX);
      speed.set(withTiming(restSpeed, { duration: 1100, easing: Easing.out(Easing.quad) }));
    });

  return (
    <GestureDetector gesture={pan}>
      <View className="flex-1">
        {Array.from({ length: slots }, (_, index) => (
          <BeltCard
            key={index}
            index={index}
            viewport={viewport}
            beltWidth={beltWidth}
            offset={offset}
          />
        ))}
      </View>
    </GestureDetector>
  );
};

export const FounderMarquee = memo(FounderMarqueeComponent);

type BeltCardProps = {
  index: number;
  viewport: number;
  beltWidth: number;
  offset: SharedValue<number>;
};

const BeltCard = ({ index, viewport, beltWidth, offset }: BeltCardProps) => {
  const card = FOUNDER_MARQUEE_CARDS[index % FOUNDER_MARQUEE_CARDS.length];

  const style = useAnimatedStyle(() => {
    const left = slotLeft(index, offset.get(), beltWidth, viewport);
    return {
      position: 'absolute' as const,
      left,
      top: 0,
      opacity: interpolate(
        left,
        [-CARD_WIDTH, 0, viewport - CARD_WIDTH, viewport],
        [0.2, 1, 1, 0.2],
        'clamp'
      ),
      transform: [
        {
          scale: interpolate(
            left,
            [-CARD_WIDTH, (viewport - CARD_WIDTH) / 2, viewport],
            [0.86, 1, 0.86],
            'clamp'
          ),
        },
      ],
    };
  });

  return (
    <Animated.View style={style}>
      <FounderCard
        card={card}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        rotationDeg={ROTATIONS[index % ROTATIONS.length]}
      />
    </Animated.View>
  );
};
