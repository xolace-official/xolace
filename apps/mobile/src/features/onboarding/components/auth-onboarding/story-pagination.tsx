/**
 * The pagination row, ported from superlist's behaviour to Xolace tokens: the
 * ACTIVE bar is ~3x the width of the others and fills left-to-right over the
 * beat's duration, then auto-advances. Dragging cancels the fill and restarts
 * it on release. Completing the last beat expands the auth sheet on its own.
 */
import { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { STORY_BEATS } from '@/src/features/onboarding/story-beats';

const GAP = 4;

type ItemProps = {
  index: number;
  currentIndex: number;
  animatedIndex: SharedValue<number>;
  inactiveWidth: number;
  activeWidth: number;
  total: number;
  duration: number;
  isDragging: SharedValue<boolean>;
  /** Worklet — moves the deck straight from the UI thread. */
  onAdvance: (index: number) => void;
  onFinish: () => void;
};

const PaginationItem = ({
  index,
  currentIndex,
  animatedIndex,
  inactiveWidth,
  activeWidth,
  total,
  duration,
  isDragging,
  onAdvance,
  onFinish,
}: ItemProps) => {
  const fill = useSharedValue(0);

  const barWidth = useDerivedValue(() => {
    const i = animatedIndex.get();
    let width = interpolate(
      i,
      [index - 1, index, index + 1],
      [inactiveWidth, activeWidth, inactiveWidth],
      Extrapolation.CLAMP,
    );

    // Infinite loop: the list duplicates beat 0 at the end, so index `total`
    // is really beat 0 — the first bar must grow and the last must shrink.
    if (index === 0) {
      width = Math.max(
        width,
        interpolate(i, [total - 1, total], [inactiveWidth, activeWidth], Extrapolation.CLAMP),
      );
    }
    if (index === total - 1 && i >= total - 1) {
      width = interpolate(i, [total - 1, total], [activeWidth, inactiveWidth], Extrapolation.CLAMP);
    }
    return width;
  });

  const rBarStyle = useAnimatedStyle(() => ({ width: barWidth.get() }));

  // Width-in-percent is a layout property, but the fill is absolute and
  // childless, so nothing else re-lays-out behind it.
  const rFillStyle = useAnimatedStyle(() => ({
    width: `${interpolate(fill.get(), [0, 1], [0, 100], Extrapolation.CLAMP)}%`,
    opacity: interpolate(barWidth.get(), [inactiveWidth, activeWidth], [0, 1], Extrapolation.CLAMP),
  }));

  // The beat ends when the fill's own animation ends. This has to be the
  // timing callback and not a reaction on `fill >= 1`: a reaction re-registers
  // whenever this component re-renders, and re-registration both resets its
  // "previous" to null and runs the body immediately — so a bar sitting at
  // fill 1, waiting for the reset, fired a SECOND advance. That put
  // `currentIndex` ahead of the list, leaving the visible beat with a bar that
  // never moves while the deck still swiped fine. A callback fires once, only
  // when the animation truly finishes, and `finished` is false when cancelled.
  const startFill = () => {
    'worklet';
    fill.set(0);
    fill.set(
      withTiming(1, { duration }, (finished) => {
        if (!finished) return;
        // Keyed off this bar's OWN index, never the rendered `currentIndex` —
        // only the active bar is ever filling, and `index` cannot go stale.
        if (index === total - 1) scheduleOnRN(onFinish);
        else onAdvance(index + 1);
      }),
    );
  };

  useEffect(() => {
    fill.set(0);
    if (currentIndex === index) startFill();
    // `startFill` is recreated every render by design — the effect must run on
    // beat changes only, or every unrelated render restarts the bar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, index, duration, fill]);

  // Cancel on touch, restart once the finger lifts — rather than resuming
  // mid-bar. Cancelling belongs here and not in the style worklet: a style is
  // evaluated every frame and must not have side effects.
  useAnimatedReaction(
    () => isDragging.get(),
    (dragging, wasDragging) => {
      if (dragging) {
        cancelAnimation(fill);
        return;
      }
      // `wasDragging === true` and not just "not dragging": this reaction
      // re-registers on every render with a null previous, and an unguarded
      // restart there meant any re-render sent the active bar back to 0.
      // No `fill > 0` guard either — a hold that begins the instant a beat
      // starts leaves the fill at exactly 0, and skipping the restart there
      // would stall the tale on that beat forever.
      if (wasDragging === true && currentIndex === index) startFill();
    },
  );

  return (
    <Animated.View className="h-0.5 rounded-full bg-foreground/15 overflow-hidden" style={rBarStyle}>
      <Animated.View className="absolute top-0 bottom-0 left-0 bg-ember" style={rFillStyle} />
    </Animated.View>
  );
};

export const StoryPagination = ({
  currentIndex,
  animatedIndex,
  isDragging,
  onAdvance,
  onFinish,
}: {
  currentIndex: number;
  animatedIndex: SharedValue<number>;
  isDragging: SharedValue<boolean>;
  onAdvance: (index: number) => void;
  onFinish: () => void;
}) => {
  const { width } = useWindowDimensions();
  const padding = width * 0.16;
  const total = STORY_BEATS.length;
  // Reserve room for the active bar's 3x expansion so the row never overflows.
  const itemWidth = (width - padding * 2 - (total - 1) * GAP) / (total + 2);

  return (
    <View className="flex-row items-center justify-center" style={{ gap: GAP, paddingHorizontal: padding }}>
      {STORY_BEATS.map((beat, index) => (
        <PaginationItem
          key={beat.id}
          index={index}
          currentIndex={currentIndex}
          animatedIndex={animatedIndex}
          inactiveWidth={itemWidth}
          activeWidth={itemWidth * 3}
          total={total}
          duration={beat.duration}
          isDragging={isDragging}
          onAdvance={onAdvance}
          onFinish={onFinish}
        />
      ))}
    </View>
  );
};
