import MaskedView from "@react-native-masked-view/masked-view";
import React, { createContext, useContext, useMemo } from "react";
import {
	type LayoutChangeEvent,
	StyleSheet,
	View,
	type ViewInstance,
	type ViewStyle,
} from "react-native";
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

const TRACK_CONTAINER_BASE_STYLE: ViewStyle = {
	alignItems: "center",
	justifyContent: "center",
};

const ShimmerContext = createContext<ShimmerContextValue | null>(null);

const useShimmer = (): ShimmerContextValue => {
	const ctx = useContext(ShimmerContext);
	if (!ctx) {
		throw new Error("useShimmer must be used within Shimmer");
	}
	return ctx;
};

const ShimmerRoot = React.forwardRef<ViewInstance, ShimmerProps>(
	({ debug = false, children, style, onLayout, ...props }, ref) => {
		const containerWidth = useSharedValue(0);
		const containerHeight = useSharedValue(0);

		const containerDiagonal = useDerivedValue(() => {
			const w = containerWidth.get();
			const h = containerHeight.get();
			return w > 0 && h > 0 ? Math.sqrt(w * w + h * h) : 0;
		});

		const handleLayout = (e: LayoutChangeEvent) => {
			const { width, height } = e.nativeEvent.layout;
			containerWidth.set(width);
			containerHeight.set(height);
			onLayout?.(e);
		};

		const contextValue: ShimmerContextValue = useMemo(
			() => ({ containerDiagonal, containerHeight, containerWidth, debug }),
			[containerWidth, containerHeight, containerDiagonal, debug]
		);
		const containerStyle = [
			styles.container,
			style,
			debug && styles.containerDebug,
		];

		return (
			<ShimmerContext.Provider value={contextValue}>
				<View
					onLayout={handleLayout}
					ref={ref}
					style={containerStyle}
					{...props}
				>
					{children}
				</View>
			</ShimmerContext.Provider>
		);
	}
);

ShimmerRoot.displayName = "Shimmer";

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

		const overlayWidth = useDerivedValue(() => {
			if (typeof width === "number") {
				return width;
			}
			return (containerWidth.get() * Number.parseFloat(width)) / 100;
		});

		const internalProgress = useSharedValue(0);
		const activeProgress = externalProgress ?? internalProgress;

		const trackDistance = useTrackDistance({
			containerHeight,
			containerWidth,
			trackAngle,
		});

		const { animatedStyle, rotateContainerHeight } = useShimmerAnimation({
			animation,
			autoPlay: externalProgress === undefined,
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

		useAnimatedReaction(
			() => activeProgress.get(),
			(v) => {
				if (onProgress) {
					onProgress.set(v);
				}
			}
		);

		const trackContainerStyle = [
			StyleSheet.absoluteFill,
			TRACK_CONTAINER_BASE_STYLE,
			{ transform: [{ rotate: `${trackAngle}deg` }] },
		];

		const rotateContainerStyle = [
			styles.rotateContainer,
			{ height: rotateContainerHeight, width: overlayWidth },
			{ transform: [{ rotate: `${overlayAngle}deg` }] },
		];

		const trackStyle = [{ width: trackDistance }, debug && styles.trackDebug];

		const translateStyle = [
			styles.translateContainer,
			animatedStyle,
			debug && styles.overlayDebug,
		];

		return (
			<View pointerEvents="none" style={trackContainerStyle}>
				<Animated.View style={trackStyle}>
					<Animated.View ref={ref} style={translateStyle}>
						<Animated.View style={rotateContainerStyle}>
							{children}
						</Animated.View>
					</Animated.View>
				</Animated.View>
			</View>
		);
	}
);

ShimmerOverlay.displayName = "Shimmer.Overlay";

const ShimmerMask = ({ children, overlay, background }: ShimmerMaskProps) => {
	const { debug } = useShimmer();

	return (
		<>
			<MaskedView maskElement={children}>
				<View
					accessibilityElementsHidden
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

const Shimmer = Object.assign(ShimmerRoot, {
	Mask: ShimmerMask,
	Overlay: ShimmerOverlay,
});

export default Shimmer;
