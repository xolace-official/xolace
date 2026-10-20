import React, { useEffect, useMemo, useState } from "react";
import { View, ViewProps } from "react-native";
import { Canvas, DashPathEffect, Path, Skia } from "@shopify/react-native-skia";
import { useThemeColor } from "heroui-native";
import {
  Easing,
  withRepeat,
  useDerivedValue,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";


interface Props extends ViewProps {
  strokeWidth?: number;
  dashLength?: number;
  gapLength?: number;
  animationSpeed?: number;
  borderRadius?: number;
  strokeColor?: string;
  direction?: "clockwise" | "counterclockwise";
  children?: React.ReactNode;
}

export const AnimatedDashedBorder: React.FC<Props> = ({
  strokeWidth = 2,
  dashLength = 12,
  gapLength = 6,
  // Anim speed in ms. Lower = faster dash travel. 1500ms chosen to feel calm but noticeable.
  animationSpeed = 1500,
  borderRadius = 8,
  strokeColor,
  direction = "clockwise",
  children,
  style,
  ...props
}) => {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const borderColor = useThemeColor("border") as string;
  const resolvedStrokeColor = strokeColor ?? borderColor;

  // Reanimated phase (pixels). Skia's DashPathEffect expects phase in device px along the path.
  // We drive this with a linear, infinite timing to create continuous motion.
  const rPhase = useSharedValue(0);

  // Compute a dash length that evenly distributes around the rounded-rect perimeter.
  // Why: prevents a "broken" last segment and keeps dash rhythm consistent regardless of size.
  // Math:
  //  - Rounded-rect perimeter = 2*(w + h - 2r) + 2*π*r
  //  - Choose number of dashes, then infer dash length = (perimeter/num) - gap
  const adjustedDashLength = useMemo(() => {
    if (!size.w || !size.h) return Math.max(3, dashLength);

    // Subtract stroke to draw inside bounds (avoids clipping) and +1 to mitigate half-pixel rounding.
    const w = Math.max(0, size.w - strokeWidth) + 1;
    const h = Math.max(0, size.h - strokeWidth);
    const r = Math.min(borderRadius, Math.min(w, h) / 2);

    const perimeter = 2 * (w + h - 2 * r) + 2 * Math.PI * r;

    // Floor to avoid partial dash at the seam. Enforce a min of 8 to prevent sparse look on small views.
    const targetNumDashes = Math.floor(perimeter / (dashLength + gapLength));
    const actualNumDashes = Math.max(8, targetNumDashes);

    const totalDashLength = perimeter / actualNumDashes;
    const calculatedDashLength = totalDashLength - gapLength;

    // Clamp to >=3px so dashes don’t become nearly dots on very small sizes.
    return Math.max(3, calculatedDashLength);
  }, [size, strokeWidth, borderRadius, dashLength, gapLength]);

  // Ensure gaps don’t collapse visually on dense perimeters.
  const adjustedGapLength = Math.max(3, gapLength);
  const dashCycle = adjustedDashLength + adjustedGapLength;

  useEffect(() => {
    rPhase.set(0);
    // Phase direction: Skia advances the dash with negative phase for clockwise feel on this path.
    // We step by one full dash+gap cycle so the pattern appears to scroll seamlessly.
    const targetValue = direction === "clockwise" ? -dashCycle : dashCycle;
    rPhase.set(
      withRepeat(
        withTiming(targetValue, {
          // Linear to maintain constant speed around corners; easing would visually "breathe" at joints.
          duration: animationSpeed,
          easing: Easing.linear,
        }),
        // -1 = infinite loop
        -1,
        false,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationSpeed, dashCycle, adjustedDashLength, direction]);

  // Bridge Reanimated → Skia: keep Skia value in sync without crossing the JS bridge.
  // Using derived value keeps updates on the UI thread for 60fps.
  const skPhase = useSharedValue(0);
  useDerivedValue(() => {
    skPhase.set(rPhase.get());
  });

  // Build rounded-rect path once per layout change.
  // Inset by strokeWidth/2 so the stroke is fully visible within the view’s bounds.
  const path = useMemo(() => {
    if (!size.w || !size.h) return null;
    const inset = strokeWidth / 2;
    const w = Math.max(0, size.w - strokeWidth);
    const h = Math.max(0, size.h - strokeWidth);
    const r = Math.min(borderRadius, Math.min(w, h) / 2);

    const p = Skia.PathBuilder.Make();

    const rect = Skia.XYWHRect(inset, inset, w, h);
    p.addRRect(Skia.RRectXY(rect, r, r));
    return p.build();
  }, [size, strokeWidth, borderRadius]);

  return (
    <View
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize({ w: width, h: height });
      }}
      style={[{ position: "relative" }, style]}
      {...props}
    >
      {children}
      {!!path && (
        <Canvas
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            // +1 to width/height combats antialias clipping on the far edge when caps are round.
            width: size.w + 1,
            height: size.h + 1,
            pointerEvents: "none",
          }}
        >
          <Path
            path={path}
            style="stroke"
            color={resolvedStrokeColor}
            strokeWidth={strokeWidth}
            // Round joins/caps keep dash ends visually soft at corners.
            strokeJoin="round"
            strokeCap="round"
          >
            {/* DashPathEffect: intervals=[dash,gap]; phase in px shifts pattern along the path. */}
            <DashPathEffect intervals={[adjustedDashLength, adjustedGapLength]} phase={skPhase} />
          </Path>
        </Canvas>
      )}
    </View>
  );
};


