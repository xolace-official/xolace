import { useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTokenColor } from "@/lib/use-token-color";

/** The card's 16 pt margins on each side. */
const MARGINS = 32;
/** Drawn a little past the card's bottom; the card clips it. */
const OVERDRAW = 40;
/** The highlight's white at its brightest. */
const HIGHLIGHT = 0.14;

/**
 * The Plus card's soft white highlight, top right: CSS `radial-gradient(140% 120% at 100% 0%,
 * white 14%, transparent 55%)` as a circle squashed to the ellipse (react-native-svg clips
 * rx/ry beyond the box, so it's userSpaceOnUse with a scale).
 */
export function PlusHighlight({ height }: { height: number }) {
	const w = useWindowDimensions().width - MARGINS;
	// react-native-svg ignores an rgba stop's alpha: white, with the opacity apart.
	const white = useTokenColor("on-art");
	const rx = 1.4 * w;
	const ry = 1.2 * height;
	return (
		<Svg
			pointerEvents="none"
			style={{
				height: height + OVERDRAW,
				left: 0,
				position: "absolute",
				top: 0,
				width: w,
			}}
		>
			<Defs>
				<RadialGradient
					cx={w}
					cy={0}
					fx={w}
					fy={0}
					gradientTransform={`scale(1 ${ry / rx})`}
					gradientUnits="userSpaceOnUse"
					id="plus-card-highlight"
					r={rx}
				>
					<Stop offset="0" stopColor={white} stopOpacity={HIGHLIGHT} />
					<Stop offset="0.55" stopColor={white} stopOpacity={0} />
				</RadialGradient>
			</Defs>
			<Rect
				fill="url(#plus-card-highlight)"
				height={height + OVERDRAW}
				width={w}
				x={0}
				y={0}
			/>
		</Svg>
	);
}
