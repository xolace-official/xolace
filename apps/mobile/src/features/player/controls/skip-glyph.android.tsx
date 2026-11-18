import Svg, { Path, Text } from "react-native-svg";
import { useTokenColor } from "@/lib/use-token-color";

/** Android has no `gobackward.15`: the board's arc, arrowhead and "15", on a 24 grid. Forward
 * mirrors the arc but not the text. */
export function SkipGlyph({ dir, size }: { dir: -1 | 1; size: number }) {
	const ink = useTokenColor("player-ink");
	const mirror = dir > 0 ? "translate(24 0) scale(-1 1)" : undefined;
	return (
		<Svg height={size} viewBox="0 0 24 24" width={size}>
			<Path
				d="M12 4.5A8.5 8.5 0 1 1 4.64 8.75"
				fill="none"
				stroke={ink}
				strokeLinecap="round"
				strokeWidth={1.7}
				transform={mirror}
			/>
			<Path d="M12.4 1.7L8.7 4.5l3.7 2.8z" fill={ink} transform={mirror} />
			<Text
				fill={ink}
				fontSize={7.4}
				fontWeight="700"
				textAnchor="middle"
				x={12}
				y={15.6}
			>
				15
			</Text>
		</Svg>
	);
}
