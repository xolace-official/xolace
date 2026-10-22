import type React from "react";
import type { ViewProps } from "react-native";
import type {
	DerivedValue,
	SharedValue,
	WithSpringConfig,
	WithTimingConfig,
} from "react-native-reanimated";

export interface ShimmerContextValue {
	containerDiagonal: DerivedValue<number>;
	containerHeight: SharedValue<number>;
	containerWidth: SharedValue<number>;
	debug: boolean;
}

export interface ShimmerProps extends ViewProps {
	children: React.ReactNode;
	debug?: boolean;
}

interface ShimmerAnimationConfigBase {
	numberOfReps?: number;
	reverse?: boolean;
}

export type ShimmerAnimationConfig =
	| (ShimmerAnimationConfigBase & { type: "timing"; config?: WithTimingConfig })
	| (ShimmerAnimationConfigBase & {
			type: "spring";
			config?: WithSpringConfig;
	  });

export type ShimmerOverlayWidth = number | `${number}%`;

export interface ShimmerOverlayProps {
	animation?: ShimmerAnimationConfig;
	children: React.ReactNode;
	duration?: number;
	initialDelay?: number;
	onProgress?: SharedValue<number>;
	overlayAngle?: number;
	progress?: SharedValue<number>;
	repeatDelay?: number;
	trackAngle?: number;
	width: ShimmerOverlayWidth;
}

export interface ShimmerMaskProps {
	background?: React.ReactNode;
	children: React.ReactElement;
	overlay: React.ReactElement;
}

export interface UseShimmerAnimationConfig
	extends Pick<ShimmerContextValue, "containerWidth" | "containerHeight">,
		Required<Pick<ShimmerOverlayProps, "trackAngle" | "overlayAngle">>,
		Pick<
			ShimmerOverlayProps,
			"duration" | "initialDelay" | "repeatDelay" | "animation"
		> {
	autoPlay?: boolean;
	overlayWidth: DerivedValue<number>;
	progress: SharedValue<number>;
	trackDistance: DerivedValue<number>;
}
