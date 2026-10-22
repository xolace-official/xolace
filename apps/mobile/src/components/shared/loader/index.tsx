import type { ViewInstance } from 'react-native';
import React, { createContext, useContext, useMemo } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  interpolate,
  interpolateColor,
  Extrapolation,
} from "react-native-reanimated";
import type {
  LoaderContextValue,
  LoaderKeyframeViewProps,
  LoaderProps,
} from "@/src/components/shared/loader/types";
import { useLoaderAnimation } from "@/src/components/shared/loader/use-loader-animation";
import {
  ANGLE_TRANSFORM_KEYS,
  parseKeyframes,
} from "@/src/components/shared/loader/utils";

export const LoaderContext = createContext<LoaderContextValue | null>(null);

// ------------------------------------------

const useLoader = (): LoaderContextValue => {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error("useLoader must be used within Loader component");
  }
  return context;
};

// ------------------------------------------

/** Root component. Provides progress SharedValue (0–1) to children via context. */
const LoaderRoot = React.forwardRef<ViewInstance, LoaderProps>(
  (
    {
      children,
      duration,
      initialDelay,
      repeatDelay,
      numberOfReps,
      reverse,
      easing,
      progress: externalProgress,
      onProgress,
      style,
      ...props
    },
    ref,
  ) => {
    const internalProgress = useSharedValue(0);
    const activeProgress = externalProgress ?? internalProgress;
    const autoPlay = externalProgress === undefined;

    useLoaderAnimation({
      progress: activeProgress,
      duration,
      initialDelay,
      repeatDelay,
      numberOfReps,
      reverse,
      easing,
      autoPlay,
    });

    useAnimatedReaction(
      () => activeProgress.get(),
      (currentProgress) => {
        if (onProgress) {
          onProgress.set(currentProgress);
        }
      },
    );

    const contextValue: LoaderContextValue = useMemo(
      () => ({ progress: activeProgress }),
      [activeProgress],
    );

    return (
      <LoaderContext.Provider value={contextValue}>
        <View ref={ref} style={style} {...props}>
          {children}
        </View>
      </LoaderContext.Provider>
    );
  },
);

LoaderRoot.displayName = "Loader";

// ------------------------------------------

/** Animated.View driven by loader progress and keyframes. Keys 0-1 or 0-100. */
const LoaderKeyframeView = React.forwardRef<
  Animated.View,
  LoaderKeyframeViewProps
>(({ keyframes, style, ...viewProps }, ref) => {
  const { progress } = useLoader();

  const parsed = parseKeyframes(keyframes);
  const numericKeys = Object.keys(parsed.numericRanges);
  const colorKeys = Object.keys(parsed.colorRanges);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.get();
    const result: Record<string, unknown> = {};

    for (const key of numericKeys) {
      result[key] = interpolate(
        p,
        parsed.inputRange,
        parsed.numericRanges[key],
        Extrapolation.CLAMP,
      );
    }

    for (const key of colorKeys) {
      result[key] = interpolateColor(
        p,
        parsed.inputRange,
        parsed.colorRanges[key],
      );
    }

    if (parsed.transformOrder.length > 0) {
      result.transform = parsed.transformOrder.map((key) => {
        const value = interpolate(
          p,
          parsed.inputRange,
          parsed.transformRanges[key],
          Extrapolation.CLAMP,
        );
        return ANGLE_TRANSFORM_KEYS.has(key)
          ? { [key]: `${value}deg` }
          : { [key]: value };
      });
    }

    return result;
  });

  const keyframeStyle = [animatedStyle, style];

  return <Animated.View ref={ref} style={keyframeStyle} {...viewProps} />;
});

LoaderKeyframeView.displayName = "Loader.KeyframeView";

// ------------------------------------------

const Loader = Object.assign(LoaderRoot, {
  KeyframeView: LoaderKeyframeView,
});

export { useLoader };
export default Loader;
