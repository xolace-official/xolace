import type React from "react";
import type { ViewProps } from "react-native";
import type { EasingFunction, EasingFunctionFactory, SharedValue } from "react-native-reanimated";
/** Loader context shared between root and child components. */
export interface LoaderContextValue {
  /** Animation progress (0–1). Driven by repeat animation or external control. */
  progress: SharedValue<number>;
}

/** Props for the root Loader component. Extends ViewProps. */
export interface LoaderProps extends ViewProps {
  /** Animation duration in ms. @default 1000 */
  duration?: number;
  /** Delay before the first animation cycle in ms. @default 0 */
  initialDelay?: number;
  /** Delay between repeat cycles in ms. @default 0 */
  repeatDelay?: number;
  /** Repeat count. Use `-1` for infinite. @default -1 */
  numberOfReps?: number;
  /** Ping-pong mode: reverses direction each iteration (0→1→0). @default false */
  reverse?: boolean;
  /** Easing function for the progress curve. @default Easing.linear */
  easing?: EasingFunction | EasingFunctionFactory;
  /**
   * External progress SharedValue (0–1) for controlled mode.
   * Disables auto-play; animation is driven entirely by this value.
   */
  progress?: SharedValue<number>;
  /**
   * SharedValue that mirrors current progress on the UI thread.
   * Useful for deriving synced animations (e.g. translateY from progress).
   */
  onProgress?: SharedValue<number>;
  /** Children to render inside the loader. */
  children: React.ReactNode;
}

/** Config for useLoaderAnimation hook. */
export interface UseLoaderAnimationConfig {
  progress: SharedValue<number>;
  duration?: number;
  initialDelay?: number;
  repeatDelay?: number;
  numberOfReps?: number;
  reverse?: boolean;
  easing?: EasingFunction | EasingFunctionFactory;
  autoPlay?: boolean;
}

export const LOADER_NUMERIC_PROPERTIES = [
  "opacity",
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "flex",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "aspectRatio",
  "zIndex",
  "borderWidth",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderStartWidth",
  "borderEndWidth",
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderTopStartRadius",
  "borderTopEndRadius",
  "borderBottomStartRadius",
  "borderBottomEndRadius",
  "borderStartStartRadius",
  "borderStartEndRadius",
  "borderEndStartRadius",
  "borderEndEndRadius",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "marginHorizontal",
  "marginVertical",
  "marginStart",
  "marginEnd",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "paddingHorizontal",
  "paddingVertical",
  "paddingStart",
  "paddingEnd",
  "top",
  "right",
  "bottom",
  "left",
  "gap",
  "rowGap",
  "columnGap",
  "elevation",
  "shadowOpacity",
  "shadowRadius",
  "outlineWidth",
  "outlineOffset",
] as const;

type LoaderKeyframeNumericProperty = (typeof LOADER_NUMERIC_PROPERTIES)[number];

export const LOADER_COLOR_PROPERTIES = [
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderStartColor",
  "borderEndColor",
  "borderBlockColor",
  "borderBlockEndColor",
  "borderBlockStartColor",
  "shadowColor",
  "outlineColor",
] as const;

type LoaderKeyframeColorProperty = (typeof LOADER_COLOR_PROPERTIES)[number];

export const LOADER_NUMERIC_TRANSFORM_KEYS = [
  "translateX",
  "translateY",
  "scale",
  "scaleX",
  "scaleY",
  "perspective",
] as const;

export const LOADER_ANGLE_TRANSFORM_KEYS = [
  "rotate",
  "rotateX",
  "rotateY",
  "rotateZ",
  "skewX",
  "skewY",
] as const;

type LoaderNumericTransformEntry = {
  [K in (typeof LOADER_NUMERIC_TRANSFORM_KEYS)[number]]: { [P in K]: number };
}[(typeof LOADER_NUMERIC_TRANSFORM_KEYS)[number]];

type LoaderAngleTransformEntry = {
  [K in (typeof LOADER_ANGLE_TRANSFORM_KEYS)[number]]: { [P in K]: string | number };
}[(typeof LOADER_ANGLE_TRANSFORM_KEYS)[number]];

export type LoaderKeyframeTransformEntry = LoaderNumericTransformEntry | LoaderAngleTransformEntry;

export type LoaderKeyframeStyle = {
  [K in LoaderKeyframeNumericProperty]?: number;
} & {
  [K in LoaderKeyframeColorProperty]?: string;
} & {
  transform?: readonly LoaderKeyframeTransformEntry[];
};

/** Keyframes: keys 0-1 or 0-100 (auto-normalized to 0-1). */
export type LoaderKeyframes = Record<number, LoaderKeyframeStyle>;

/** Props for Loader.KeyframeView. Extends ViewProps. */
export interface LoaderKeyframeViewProps extends ViewProps {
  /** Keyframe definitions. Keys 0-1 or 0-100. */
  keyframes: LoaderKeyframes;
}
