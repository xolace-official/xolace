/** A soft radial ember, drawn with `react-native-svg`. */
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

export const EmberGlow = ({
	id,
	size,
	color,
	opacity = 0.5,
}: {
	id: string;
	size: number;
	color: string;
	/** Alpha at the very centre. Falls to zero at the edge. */
	opacity?: number;
}) => (
	<Svg height={size} pointerEvents="none" width={size}>
		<Defs>
			{/* Three stops: a straight ramp reads as a hard disc; the mid stop gives a hot core
			    and long tail. */}
			<RadialGradient cx="50%" cy="50%" id={id} r="50%">
				<Stop offset="0" stopColor={color} stopOpacity={opacity} />
				<Stop offset="0.42" stopColor={color} stopOpacity={opacity * 0.4} />
				<Stop offset="1" stopColor={color} stopOpacity={0} />
			</RadialGradient>
		</Defs>
		<Rect fill={`url(#${id})`} height={size} width={size} />
	</Svg>
);
