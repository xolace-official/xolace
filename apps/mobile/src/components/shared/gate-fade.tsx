import { Canvas, LinearGradient, Rect, vec } from "@shopify/react-native-skia";

type Props = {
	width: number;
	height: number;
	color: string;
	startAlpha?: string;
	endAlpha?: string;
	flip?: boolean;
};

export function GateFade({
	width,
	height,
	color,
	startAlpha = "00",
	endAlpha = "F2",
	flip = false,
}: Props) {
	const start = vec(0, flip ? height : 0);
	const end = vec(0, flip ? 0 : height);

	return (
		<Canvas pointerEvents="none" style={{ height, width }}>
			<Rect height={height} width={width} x={0} y={0}>
				<LinearGradient
					colors={[color + startAlpha, color + endAlpha]}
					end={end}
					start={start}
				/>
			</Rect>
		</Canvas>
	);
}
