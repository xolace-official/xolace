import { Canvas, DashPathEffect, Path, Skia } from "@shopify/react-native-skia";
import { useThemeColor } from "heroui-native";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { View, type ViewProps } from "react-native";
import {
	Easing,
	useDerivedValue,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";

interface Props extends ViewProps {
	animationSpeed?: number;
	borderRadius?: number;
	children?: React.ReactNode;
	dashLength?: number;
	direction?: "clockwise" | "counterclockwise";
	gapLength?: number;
	strokeColor?: string;
	strokeWidth?: number;
}

export const AnimatedDashedBorder: React.FC<Props> = ({
	strokeWidth = 2,
	dashLength = 12,
	gapLength = 6,
	// Milliseconds per cycle; lower is faster.
	animationSpeed = 1500,
	borderRadius = 8,
	strokeColor,
	direction = "clockwise",
	children,
	style,
	...props
}) => {
	const [size, setSize] = useState({ h: 0, w: 0 });
	const borderColor = useThemeColor("border") as string;
	const resolvedStrokeColor = strokeColor ?? borderColor;

	// Dash phase in device px along the path, driven by a linear infinite timing.
	const rPhase = useSharedValue(0);

	// A dash length that divides the rounded-rect perimeter evenly, so the seam has no broken
	// segment.
	const adjustedDashLength = useMemo(() => {
		if (!(size.w && size.h)) {
			return Math.max(3, dashLength);
		}

		// Stroke subtracted to draw inside bounds; +1 mitigates half-pixel rounding.
		const w = Math.max(0, size.w - strokeWidth) + 1;
		const h = Math.max(0, size.h - strokeWidth);
		const r = Math.min(borderRadius, Math.min(w, h) / 2);

		const perimeter = 2 * (w + h - 2 * r) + 2 * Math.PI * r;

		// Floored to avoid a partial dash at the seam; at least 8 so small views are not sparse.
		const targetNumDashes = Math.floor(perimeter / (dashLength + gapLength));
		const actualNumDashes = Math.max(8, targetNumDashes);

		const totalDashLength = perimeter / actualNumDashes;
		const calculatedDashLength = totalDashLength - gapLength;

		// At least 3px so dashes do not become dots on small sizes.
		return Math.max(3, calculatedDashLength);
	}, [size, strokeWidth, borderRadius, dashLength, gapLength]);

	// Gaps must not collapse visually on dense perimeters.
	const adjustedGapLength = Math.max(3, gapLength);
	const dashCycle = adjustedDashLength + adjustedGapLength;

	useEffect(() => {
		rPhase.set(0);
		// Negative phase reads as clockwise on this path; one full dash+gap cycle scrolls
		// seamlessly.
		const targetValue = direction === "clockwise" ? -dashCycle : dashCycle;
		rPhase.set(
			withRepeat(
				withTiming(targetValue, {
					// Linear keeps constant speed around corners.
					duration: animationSpeed,
					easing: Easing.linear,
				}),
				-1,
				false
			)
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [animationSpeed, dashCycle, adjustedDashLength, direction]);

	// Bridges Reanimated to Skia on the UI thread.
	const skPhase = useSharedValue(0);
	useDerivedValue(() => {
		skPhase.set(rPhase.get());
	});

	// Rounded-rect path, inset by strokeWidth/2 so the stroke stays inside the view.
	const path = useMemo(() => {
		if (!(size.w && size.h)) {
			return null;
		}
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
				setSize({ h: height, w: width });
			}}
			style={[{ position: "relative" }, style]}
			{...props}
		>
			{children}
			{!!path && (
				<Canvas
					style={{
						height: size.h + 1,
						left: 0,
						pointerEvents: "none",
						position: "absolute",
						top: 0,
						// +1 combats antialias clipping on the far edge with round caps.
						width: size.w + 1,
					}}
				>
					<Path
						color={resolvedStrokeColor}
						path={path}
						strokeCap="round"
						strokeJoin="round"
						strokeWidth={strokeWidth}
						style="stroke"
					>
						<DashPathEffect
							intervals={[adjustedDashLength, adjustedGapLength]}
							phase={skPhase}
						/>
					</Path>
				</Canvas>
			)}
		</View>
	);
};
