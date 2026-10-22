import { type ViewInstance } from 'react-native';
import React, { createContext, useContext, useMemo } from "react";
import {
  View,
  type LayoutChangeEvent,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import Animated, {
  useDerivedValue,
  useSharedValue,
  useAnimatedReaction,
} from "react-native-reanimated";
import MaskedView from "@react-native-masked-view/masked-view";
import type {
  ShimmerContextValue,
  ShimmerProps,
  ShimmerOverlayProps,
  ShimmerMaskProps,
} from "./types";
import { styles } from "./styles";
import { useShimmerAnimation } from "./use-shimmer-animation";
import { useTrackDistance } from "./use-track-distance";

const TRACK_CONTAINER_BASE_STYLE: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
};

const ShimmerContext = createContext<ShimmerContextValue | null>(null);

const useShimmer = (): ShimmerContextValue => {
  const ctx = useContext(ShimmerContext);
  if (!ctx) throw new Error("useShimmer must be used within Shimmer");
  return ctx;
};

// ── Root ────────────────────────────────────────────────────────────────

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
      () => ({ containerWidth, containerHeight, containerDiagonal, debug }),
      [containerWidth, containerHeight, containerDiagonal, debug],
    );
    const containerStyle = [styles.container, style, debug && styles.containerDebug];

    return (
      <ShimmerContext.Provider value={contextValue}>
        <View
          ref={ref}
          style={containerStyle}
          onLayout={handleLayout}
          {...props}
        >
          {children}
        </View>
      </ShimmerContext.Provider>
    );
  },
);

ShimmerRoot.displayName = "Shimmer";

// ── Overlay ─────────────────────────────────────────────────────────────

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
    ref,
  ) => {
    const { containerWidth, containerHeight, debug } = useShimmer();

    const overlayWidth = useDerivedValue(() => {
      if (typeof width === "number") return width;
      return (containerWidth.get() * parseFloat(width)) / 100;
    });

    const internalProgress = useSharedValue(0);
    const activeProgress = externalProgress ?? internalProgress;

    const trackDistance = useTrackDistance({
      containerWidth,
      containerHeight,
      trackAngle,
    });

    const { animatedStyle, rotateContainerHeight } = useShimmerAnimation({
      trackAngle,
      overlayAngle,
      containerWidth,
      containerHeight,
      overlayWidth,
      trackDistance,
      progress: activeProgress,
      duration,
      initialDelay,
      repeatDelay,
      animation,
      autoPlay: externalProgress === undefined,
    });

    useAnimatedReaction(
      () => activeProgress.get(),
      (v) => {
        if (onProgress) onProgress.set(v);
      },
    );

    const trackContainerStyle = [
      StyleSheet.absoluteFill,
      TRACK_CONTAINER_BASE_STYLE,
      { transform: [{ rotate: `${trackAngle}deg` }] },
    ];

    const rotateContainerStyle = [
      styles.rotateContainer,
      { width: overlayWidth, height: rotateContainerHeight },
      { transform: [{ rotate: `${overlayAngle}deg` }] },
    ];

    const trackStyle = [{ width: trackDistance }, debug && styles.trackDebug];

    const translateStyle = [
      styles.translateContainer,
      animatedStyle,
      debug && styles.overlayDebug,
    ];

    return (
      <View style={trackContainerStyle} pointerEvents="none">
        <Animated.View style={trackStyle}>
          <Animated.View ref={ref} style={translateStyle}>
            <Animated.View style={rotateContainerStyle}>
              {children}
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </View>
    );
  },
);

ShimmerOverlay.displayName = "Shimmer.Overlay";

// ── Mask ────────────────────────────────────────────────────────────────

const ShimmerMask = ({ children, overlay, background }: ShimmerMaskProps) => {
  const { debug } = useShimmer();

  return (
    <>
      <MaskedView maskElement={children}>
        <View
          style={styles.maskSizer}
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
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

// ── Export ───────────────────────────────────────────────────────────────

const Shimmer = Object.assign(ShimmerRoot, {
  Overlay: ShimmerOverlay,
  Mask: ShimmerMask,
});

export default Shimmer;
