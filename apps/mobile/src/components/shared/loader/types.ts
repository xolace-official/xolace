import type React from "react";
import type { ViewProps } from "react-native";
import type {
	EasingFunction,
	EasingFunctionFactory,
	SharedValue,
} from "react-native-reanimated";
export interface LoaderContextValue {
	progress: SharedValue<number>;
}

export interface LoaderProps extends ViewProps {
	children: React.ReactNode;
	duration?: number;
	easing?: EasingFunction | EasingFunctionFactory;
	initialDelay?: number;
	numberOfReps?: number;
	onProgress?: SharedValue<number>;
	progress?: SharedValue<number>;
	repeatDelay?: number;
	reverse?: boolean;
}

export interface UseLoaderAnimationConfig {
	autoPlay?: boolean;
	duration?: number;
	easing?: EasingFunction | EasingFunctionFactory;
	initialDelay?: number;
	numberOfReps?: number;
	progress: SharedValue<number>;
	repeatDelay?: number;
	reverse?: boolean;
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
	[K in (typeof LOADER_ANGLE_TRANSFORM_KEYS)[number]]: {
		[P in K]: string | number;
	};
}[(typeof LOADER_ANGLE_TRANSFORM_KEYS)[number]];

export type LoaderKeyframeTransformEntry =
	| LoaderNumericTransformEntry
	| LoaderAngleTransformEntry;

export type LoaderKeyframeStyle = {
	[K in LoaderKeyframeNumericProperty]?: number;
} & {
	[K in LoaderKeyframeColorProperty]?: string;
} & {
	transform?: readonly LoaderKeyframeTransformEntry[];
};

export type LoaderKeyframes = Record<number, LoaderKeyframeStyle>;

export interface LoaderKeyframeViewProps extends ViewProps {
	keyframes: LoaderKeyframes;
}
