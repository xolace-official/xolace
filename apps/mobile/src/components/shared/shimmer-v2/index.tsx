import MaskedView from "@react-native-masked-view/masked-view";
import React, { createContext, useCallback, useContext, useMemo } from "react";
import type { ViewInstance } from "react-native";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";
import Animated, {
	useAnimatedReaction,
	useDerivedValue,
	useSharedValue,
} from "react-native-reanimated";
import { styles } from "./styles";
import type {
	ShimmerContextValue,
	ShimmerMaskProps,
	ShimmerOverlayProps,
	ShimmerProps,
} from "./types";
import { useShimmerAnimation } from "./use-shimmer-animation";
import { useTrackDistance } from "./use-track-distance";

const ShimmerContext = createContext<ShimmerContextValue | null>(null);

// ------------------------------------------

const useShimmer = (): ShimmerContextValue => {
	const context = useContext(ShimmerContext);
	if (!context) {
		throw new Error("useShimmer must be used within Shimmer component");
	}
	return context;
};

// ------------------------------------------

/** Root component. Measures its own dimensions and provides context to children. */
const ShimmerRoot = React.forwardRef<ViewInstance, ShimmerProps>(
	({ debug = false, children, style, onLayout, ...props }, ref) => {
		const containerWidth = useSharedValue(0);
		const containerHeight = useSharedValue(0);

		const containerDiagonal = useDerivedValue(() => {
			const width = containerWidth.get();
			const height = containerHeight.get();
			if (width > 0 && height > 0) {
				return Math.sqrt(width * width + height * height);
			}
			return 0;
		});

		const handleContainerLayout = useCallback(
			(event: LayoutChangeEvent) => {
				const { width, height } = event.nativeEvent.layout;
				containerWidth.set(width);
				containerHeight.set(height);
				onLayout?.(event);
			},
			[containerWidth, containerHeight, onLayout]
		);

		const contextValue: ShimmerContextValue = useMemo(
			() => ({
				containerDiagonal,
				containerHeight,
				containerWidth,
				debug,
			}),
			[containerWidth, containerHeight, containerDiagonal, debug]
		);

		return (
			<ShimmerContext value={contextValue}>
				<View
					onLayout={handleContainerLayout}
					ref={ref}
					style={[styles.container, style, debug && styles.containerDebug]}
					{...props}
				>
					{children}
				</View>
			</ShimmerContext>
		);
	}
);

ShimmerRoot.displayName = "Shimmer";

// ------------------------------------------

/** Animated overlay that sweeps across the Shimmer container. */
const ShimmerOverlay = React.forwardRef<Animated.View, ShimmerOverlayProps>(
	(
		{
			children,
			width,
			trackAngle = 0,
			overlayAngle = 0,
			duration,
			initialDelay,
			repeatDelay,
			animation,
			progress: externalProgress,
			onProgress,
		},
		ref
	) => {
		const { containerWidth, containerHeight, debug } = useShimmer();

		// Resolve width prop to pixels (handles both absolute and percentage values)
		const overlayWidth = useDerivedValue(() => {
			if (typeof width === "number") {
				return width;
			}
			const percentage = Number.parseFloat(width);
			return (containerWidth.get() * percentage) / 100;
		});

		const internalProgress = useSharedValue(0);
		const activeProgress = externalProgress ?? internalProgress;
		const autoPlay = externalProgress === undefined;

		const trackDistance = useTrackDistance({
			containerHeight,
			containerWidth,
			trackAngle,
		});

		const { animatedStyle, rotateContainerHeight } = useShimmerAnimation({
			animation,
			autoPlay,
			containerHeight,
			containerWidth,
			duration,
			initialDelay,
			overlayAngle,
			overlayWidth,
			progress: activeProgress,
			repeatDelay,
			trackAngle,
			trackDistance,
		});

		// Mirror progress to onProgress SharedValue (UI thread only)
		useAnimatedReaction(
			() => activeProgress.get(),
			(currentProgress) => {
				if (onProgress) {
					onProgress.set(currentProgress);
				}
			}
		);

		return (
			<View
				pointerEvents="none"
				style={[
					StyleSheet.absoluteFill,
					styles.overlayTrack,
					{ transform: [{ rotate: `${trackAngle}deg` }] },
				]}
			>
				<Animated.View
					style={[{ width: trackDistance }, debug && styles.trackDebug]}
				>
					<Animated.View
						ref={ref}
						style={[
							styles.translateContainer,
							animatedStyle,
							debug && styles.overlayDebug,
						]}
					>
						<Animated.View
							style={[
								styles.rotateContainer,
								{ height: rotateContainerHeight, width: overlayWidth },
								{ transform: [{ rotate: `${overlayAngle}deg` }] },
							]}
						>
							{children}
						</Animated.View>
					</Animated.View>
				</Animated.View>
				{/* Debug: direction arrow */}
				{debug && <View style={styles.directionArrow} />}
			</View>
		);
	}
);

ShimmerOverlay.displayName = "Shimmer.Overlay";

// ------------------------------------------

/**
 * Clips the overlay to children's alpha channel via MaskedView.
 * Children must use opaque colors (e.g. text-black) for the mask to work.
 */
const ShimmerMask = ({ children, overlay, background }: ShimmerMaskProps) => {
	const { debug } = useShimmer();
	const maskElement = React.isValidElement(children) ? (
		children
	) : (
		<View>{children}</View>
	);

	return (
		<>
			<MaskedView maskElement={maskElement}>
				{/* Hidden duplicate for layout sizing — MaskedView sizes from children, not maskElement */}
				<View
					accessibilityElementsHidden={true}
					accessible={false}
					importantForAccessibility="no-hide-descendants"
					pointerEvents="none"
					style={styles.maskSizer}
				>
					{children}
				</View>
				{background !== undefined && (
					<View style={StyleSheet.absoluteFill}>{background}</View>
				)}
				{!debug && overlay}
			</MaskedView>
			{debug && overlay}
		</>
	);
};

ShimmerMask.displayName = "Shimmer.Mask";

// ------------------------------------------

const Shimmer = Object.assign(ShimmerRoot, {
	Mask: ShimmerMask,
	Overlay: ShimmerOverlay,
});

export default Shimmer;
