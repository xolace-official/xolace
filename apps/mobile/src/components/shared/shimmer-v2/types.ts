import type React from "react";
import type { ViewProps } from "react-native";
import type {
	DerivedValue,
	SharedValue,
	WithSpringConfig,
	WithTimingConfig,
} from "react-native-reanimated";

/** Shimmer context shared between root and child components. */
export interface ShimmerContextValue {
	/** Container diagonal: sqrt(width² + height²). */
	containerDiagonal: DerivedValue<number>;
	/** Container height (auto-measured via onLayout). */
	containerHeight: SharedValue<number>;
	/** Container width (auto-measured via onLayout). */
	containerWidth: SharedValue<number>;
	/** When true, renders visual debugging aids (borders, track line). */
	debug: boolean;
}

/** Props for the root Shimmer component. Extends ViewProps. */
export interface ShimmerProps extends ViewProps {
	children: React.ReactNode;
	/** Enables visual debugging aids. @default false */
	debug?: boolean;
}

/** Base fields shared by all animation config variants. */
interface ShimmerAnimationConfigBase {
	/** Repeat count. Use `-1` for infinite. @default -1 */
	numberOfReps?: number;
	/** Ping-pong mode: reverses direction each iteration. @default false */
	reverse?: boolean;
}

export type ShimmerAnimationConfig =
	| (ShimmerAnimationConfigBase & { type: "timing"; config?: WithTimingConfig })
	| (ShimmerAnimationConfigBase & {
			type: "spring";
			config?: WithSpringConfig;
	  });

/** Overlay width: absolute pixels, or a percentage of container width. */
export type ShimmerOverlayWidth = number | `${number}%`;

/** Props for the Shimmer.Overlay component. */
export interface ShimmerOverlayProps {
	/** Full animation config. @default { type: "timing", config: { duration: 2000 } } */
	animation?: ShimmerAnimationConfig;
	/** Content rendered inside the animated highlight. */
	children: React.ReactNode;
	/** Animation duration in ms; ignored when `animation.config.duration` is set. @default 2000 */
	duration?: number;
	/** Delay before the first animation cycle (ms). @default 500 */
	initialDelay?: number;
	/** SharedValue mirroring current progress on the UI thread, for synced animations. */
	onProgress?: SharedValue<number>;
	/** Rotation applied to the overlay content (degrees). @default 0 */
	overlayAngle?: number;
	/** External progress (0–1) for controlled mode; disables auto-play. */
	progress?: SharedValue<number>;
	/** Delay between repeat cycles (ms). @default 0 */
	repeatDelay?: number;
	/** Track direction in degrees: 0 right, 90 down, 180 left, 270 up. @default 0 */
	trackAngle?: number;
	/** Width of the overlay highlight — pixels or percentage of container. */
	width: ShimmerOverlayWidth;
}

/** Props for Shimmer.Mask, which clips the overlay to the children's alpha channel. */
export interface ShimmerMaskProps {
	/** Base fill rendered behind the overlay, clipped to the mask shape. */
	background?: React.ReactNode;
	/** Mask shape. Must use opaque colors — MaskedView clips via the alpha channel. */
	children: React.ReactNode;
	/** Animated overlay element (typically a Shimmer.Overlay). */
	overlay: React.ReactNode;
}

/** Config for useShimmerAnimation. */
export interface UseShimmerAnimationConfig
	extends Pick<ShimmerContextValue, "containerWidth" | "containerHeight">,
		Required<Pick<ShimmerOverlayProps, "trackAngle" | "overlayAngle">>,
		Pick<
			ShimmerOverlayProps,
			"duration" | "initialDelay" | "repeatDelay" | "animation"
		> {
	/** Auto-play animation when dimensions are ready. @default true */
	autoPlay?: boolean;
	/** Resolved overlay width (pixels). Derived from the width prop. */
	overlayWidth: DerivedValue<number>;
	/** Animation progress (0–1). */
	progress: SharedValue<number>;
	/** Total distance the overlay must travel along the track. */
	trackDistance: DerivedValue<number>;
}
