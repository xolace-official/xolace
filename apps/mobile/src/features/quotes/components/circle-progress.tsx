import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { useThemeColor } from "heroui-native";
import { useEffect } from "react";
import {
	useDerivedValue,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";

interface CircleProgressProps {
	progress: number;
	size?: number;
	strokeWidth?: number;
}

export function CircleProgress({
	progress,
	size = 36,
	strokeWidth = 5,
}: CircleProgressProps) {
	const accentColor = useThemeColor("accent") as string;
	const radius = (size - strokeWidth) / 2;
	const center = size / 2;

	const animatedProgress = useSharedValue(progress);

	useEffect(() => {
		animatedProgress.set(withTiming(progress, { duration: 400 }));
	}, [progress, animatedProgress]);

	const backgroundPath = (() => {
		const path = Skia.PathBuilder.Make();
		path.addCircle(center, center, radius);
		return path.build();
	})();

	const progressPath = useDerivedValue(() => {
		const path = Skia.PathBuilder.Make();
		path.addArc(
			{
				height: size - strokeWidth,
				width: size - strokeWidth,
				x: strokeWidth / 2,
				y: strokeWidth / 2,
			},
			-90,
			animatedProgress.get() * 360
		);
		return path.build();
	});

	const canvasStyle = { height: size, width: size };

	return (
		<Canvas style={canvasStyle}>
			<Path
				color="rgba(255, 255, 255, 0.15)"
				path={backgroundPath}
				strokeCap="round"
				strokeWidth={strokeWidth}
				style="stroke"
			/>
			<Path
				color={accentColor}
				path={progressPath}
				strokeCap="round"
				strokeWidth={strokeWidth}
				style="stroke"
			/>
		</Canvas>
	);
}
