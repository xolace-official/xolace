import { Canvas, LinearGradient, Rect, vec } from "@shopify/react-native-skia";

type Props = {
	width: number;
	height: number;
	/** Base frost color (resolved token hex, e.g. surface). */
	color: string;
	/** Alpha (2-hex) at the transparent edge. */
	startAlpha?: string;
	/** Alpha (2-hex) at the frosted edge. */
	endAlpha?: string;
	/** When true the opaque edge is the top instead of the bottom. */
	flip?: boolean;
};

/** Vertical gradient veil that dissolves live content into a frosted edge
 * (color + "XX" → color + "00"). Position it absolutely over the seam. */
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
