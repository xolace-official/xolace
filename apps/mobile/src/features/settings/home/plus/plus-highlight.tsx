import { useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTokenColor } from "@/lib/use-token-color";

const MARGINS = 32;
const OVERDRAW = 40;
const HIGHLIGHT = 0.14;

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
