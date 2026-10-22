import {
  useAnimatedStyle,
  useAnimatedReaction,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  type WithTimingConfig,
  type WithSpringConfig,
  useDerivedValue,
} from 'react-native-reanimated';
import type { UseShimmerAnimationConfig } from './types';

export const useShimmerAnimation = (config: UseShimmerAnimationConfig) => {
  const {
    trackAngle,
    overlayAngle,
    containerWidth,
    containerHeight,
    overlayWidth,
    trackDistance,
    progress,
    duration,
    initialDelay = 500,
    repeatDelay = 0,
    animation,
    autoPlay = true,
  } = config;

  const animationType = animation?.type ?? 'timing';
  const defaultDuration = duration ?? 2000;
  const animationConfig = animation?.config ?? ({ duration: defaultDuration } as WithTimingConfig);
  const numberOfReps = animation?.numberOfReps ?? -1;
  const reverse = animation?.reverse ?? false;

  useAnimatedReaction(
    () => ({
      containerW: containerWidth.get(),
      highlightW: overlayWidth.get(),
    }),
    (current) => {
      if (!autoPlay) return;
      if (current.containerW <= 0 || current.highlightW <= 0) return;

      progress.set(0);

      const animateToEnd =
        animationType === 'spring'
          ? withSpring(1, animationConfig as WithSpringConfig)
          : withTiming(1, animationConfig as WithTimingConfig);

      let repeatedAnimation;

      if (reverse) {
        const animateBack =
          animationType === 'spring'
            ? withSpring(0, animationConfig as WithSpringConfig)
            : withTiming(0, animationConfig as WithTimingConfig);

        const fullCycle =
          repeatDelay > 0
            ? withSequence(animateToEnd, animateBack, withDelay(repeatDelay, withTiming(0, { duration: 0 })))
            : withSequence(animateToEnd, animateBack);

        repeatedAnimation = withRepeat(fullCycle, numberOfReps, false);
      } else {
        const animationSequence =
          repeatDelay > 0
            ? withSequence(animateToEnd, withDelay(repeatDelay, withTiming(0, { duration: 0 })))
            : withSequence(animateToEnd, withTiming(0, { duration: 0 }));

        repeatedAnimation = withRepeat(animationSequence, numberOfReps, false);
      }

      progress.set(
        initialDelay > 0 ? withDelay(initialDelay, repeatedAnimation) : repeatedAnimation,
      );
    },
  );

  // Geometry — precompute constants outside derived values
  const trackAngleRad = (trackAngle * Math.PI) / 180;
  const overlayAngleRad = (overlayAngle * Math.PI) / 180;
  const cosOverlay = Math.abs(Math.cos(overlayAngleRad));
  const sinOverlay = Math.abs(Math.sin(overlayAngleRad));

  const translateContainerHeight = useDerivedValue(() => {
    const w = containerWidth.get();
    const h = containerHeight.get();
    return w * Math.abs(Math.sin(trackAngleRad)) + h * Math.abs(Math.cos(trackAngleRad));
  });

  const rotateContainerHeight = useDerivedValue(() => {
    const tch = translateContainerHeight.get();
    const hw = overlayWidth.get();
    if (tch <= 0) return 0;
    if (cosOverlay <= 0.001) return tch;
    return (tch + hw * sinOverlay) / cosOverlay;
  });

  const translateContainerWidth = useDerivedValue(() => {
    const hw = overlayWidth.get();
    const rch = rotateContainerHeight.get();
    return hw * cosOverlay + rch * sinOverlay;
  });

  const animatedStyle = useAnimatedStyle(() => {
    const cw = containerWidth.get();
    const hw = overlayWidth.get();
    if (cw <= 0 || hw <= 0) {
      return { opacity: 0, transform: [{ translateX: 0 }] };
    }

    const effectiveWidth = translateContainerWidth.get();
    const start = -effectiveWidth;
    const end = trackDistance.get();
    const translateX = start + progress.get() * (end - start);

    return {
      opacity: 1,
      width: translateContainerWidth.get(),
      height: translateContainerHeight.get(),
      transform: [{ translateX }, { translateY: '-50%' }],
    };
  });

  return { animatedStyle, rotateContainerHeight };
};
