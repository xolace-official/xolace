import { useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  interpolate,
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useThemeColor } from 'heroui-native';
import { playAffirmativePress, playSoftPress } from '@/src/lib/haptics';
import { AppText } from '@/src/components/shared/app-text';
import { cn } from '@/src/lib/utils';

/** Time user must hold to complete; drives fill progress 0→1 */
const DEFAULT_HOLD_DURATION_MS = 3000;
/** Scale on press for tactile feedback; subtle enough to feel responsive */
const PRESS_SCALE = 0.96;
const PRESS_SCALE_IN = 250;
const PRESS_SCALE_OUT = 200;

type Props = {
  /** Label shown on the button, both before and during the fill reveal. */
  label: string;
  /** Fires once the hold completes and the release animation finishes. */
  onComplete: () => void;
  holdDurationMs?: number;
  className?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedAppText = Animated.createAnimatedComponent(AppText);

/**
 * Press-and-hold CTA: a left-to-right fill sweeps across the button as the
 * user holds, revealing an inverse-color copy of the label underneath.
 * Releasing before the fill completes cancels and resets it.
 */
export function HoldToContinueButton({
  label,
  onComplete,
  holdDurationMs = DEFAULT_HOLD_DURATION_MS,
  className,
}: Props) {
  const foreground = useThemeColor('foreground') as string;
  const background = useThemeColor('background') as string;

  /** 0→1 over hold duration; drives fill width and reveal-text translation */
  const fillProgress = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const textXShared = useSharedValue(0);
  const textWidthShared = useSharedValue(0);
  const buttonWidthShared = useSharedValue(0);

  useAnimatedReaction(
    () => fillProgress.get(),
    (progress) => {
      if (progress === 1) {
        scheduleOnRN(playAffirmativePress);
      }
    },
  );

  const textStartProgress = useDerivedValue(() => {
    const buttonWidth = buttonWidthShared.get();
    const textX = textXShared.get();
    return buttonWidth > 0 ? Math.min(1, Math.max(0, textX / buttonWidth)) : 0;
  });

  const textEndProgress = useDerivedValue(() => {
    const buttonWidth = buttonWidthShared.get();
    const textX = textXShared.get();
    const textWidth = textWidthShared.get();
    return buttonWidth > 0 ? Math.min(1, Math.max(0, (textX + textWidth) / buttonWidth)) : 0;
  });

  const handlePressIn = useCallback(() => {
    playSoftPress();
    // The fill is the hold timer, not decoration: under reduce motion a plain
    // withTiming completes instantly and a single tap would pass the gate.
    fillProgress.set(withTiming(1, { duration: holdDurationMs, reduceMotion: ReduceMotion.Never }));
    pressScale.set(withTiming(PRESS_SCALE, { duration: PRESS_SCALE_IN }));
  }, [fillProgress, pressScale, holdDurationMs]);

  /** On release: if complete (progress=1) run onComplete; else cancel fill and reset */
  const handlePressOut = useCallback(() => {
    if (fillProgress.get() === 1) {
      pressScale.set(
        withTiming(1, { duration: PRESS_SCALE_OUT }, () => {
          scheduleOnRN(onComplete);
        }),
      );
    } else {
      cancelAnimation(fillProgress);
      fillProgress.set(withTiming(0, { duration: PRESS_SCALE_OUT }));
      pressScale.set(withTiming(1, { duration: PRESS_SCALE_IN }));
    }
  }, [fillProgress, pressScale, onComplete]);

  const handleButtonLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      buttonWidthShared.set(event.nativeEvent.layout.width);
    },
    [buttonWidthShared],
  );

  const handleTextLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number; x: number } } }) => {
      textXShared.set(event.nativeEvent.layout.x);
      textWidthShared.set(event.nativeEvent.layout.width);
    },
    [textXShared, textWidthShared],
  );

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.get() }],
  }));

  const fillRowAnimatedStyle = useAnimatedStyle(() => {
    const progress = fillProgress.get();
    const translateX = interpolate(progress, [0, 1], [-buttonWidthShared.get(), 0]);
    return { transform: [{ translateX }] };
  });

  const revealedTextAnimatedStyle = useAnimatedStyle(() => {
    const progress = fillProgress.get();
    const start = textStartProgress.get();
    const end = Math.max(textEndProgress.get(), start);
    const textWidth = textWidthShared.get();
    const translateX = progress < start ? 0 : interpolate(progress, [start, end], [0, -textWidth]);
    return { transform: [{ translateX }] };
  });

  return (
    <AnimatedPressable
      entering={FadeIn}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Press and hold to continue"
      // Screen-reader double-tap can't sustain a hold; "activate" completes directly.
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'activate' && onComplete()}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLayout={handleButtonLayout}
      className={cn('rounded-full h-16 px-12 items-center justify-center overflow-hidden border-2', className)}
      style={[containerAnimatedStyle, { borderCurve: 'continuous', borderColor: foreground }]}
    >
      <AppText className="text-lg font-medium" style={{ color: foreground }} onLayout={handleTextLayout}>
        {label}
      </AppText>

      {/* overflow-hidden clips fill row; enables left-to-right reveal as translateX animates */}
      <Animated.View
        className="absolute h-full flex-row items-center overflow-hidden"
        style={[fillRowAnimatedStyle, { width: buttonWidthShared }]}
      >
        <Animated.View className="h-full" style={{ width: buttonWidthShared, backgroundColor: foreground }} />
        <AnimatedAppText className="text-lg font-medium" style={[revealedTextAnimatedStyle, { color: background }]}>
          {label}
        </AnimatedAppText>
      </Animated.View>
    </AnimatedPressable>
  );
}
