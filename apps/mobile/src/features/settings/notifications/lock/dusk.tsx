import { StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { LinearGradient } from "@/components/shared/styled";
import { useTokenColors } from "@/lib/use-token-color";

/** The card's 16 pt margins on each side. */
const MARGINS = 32;
/** Board `.lock`: the night sky, then a cool light top right and a warm glow low. The stops are
 * opaque tokens; react-native-svg ignores a stop colour's alpha, so it goes in `stopOpacity`. */
const SKY_STOPS = [0, 0.55, 1] as const;
const GLOW_OPACITY = 0.35;
const WARM_OPACITY = 0.55;
const ROSE_OPACITY = 0.25;

/** The lock card's dusk background (board `.lock` CSS). A printed object: the same in every theme. */
export function Dusk({ height }: { height: number }) {
	const w = useWindowDimensions().width - MARGINS;
	const [top, mid, low, glow, warm, rose] = useTokenColors([
		"notify-dusk-top",
		"notify-dusk-mid",
		"notify-dusk-low",
		"notify-glow",
		"notify-warm",
		"notify-rose",
	]);
	return (
		<>
			<LinearGradient
				colors={[top, mid, low]}
				locations={SKY_STOPS}
				style={StyleSheet.absoluteFill}
			/>
			<Svg height={height} style={StyleSheet.absoluteFill} width={w}>
				<Defs>
					<RadialGradient
						cx={0.8}
						cy={0}
						fx={0.8}
						fy={0}
						gradientUnits="objectBoundingBox"
						id="notify-lock-top"
						rx={0.9}
						ry={0.6}
					>
						<Stop offset={0} stopColor={glow} stopOpacity={GLOW_OPACITY} />
						<Stop offset={0.7} stopColor={glow} stopOpacity={0} />
					</RadialGradient>
					<RadialGradient
						cx={0.5}
						cy={1.18}
						fx={0.5}
						fy={1.18}
						gradientUnits="objectBoundingBox"
						id="notify-lock-low"
						rx={1.2}
						ry={0.7}
					>
						<Stop offset={0} stopColor={warm} stopOpacity={WARM_OPACITY} />
						<Stop offset={0.4} stopColor={rose} stopOpacity={ROSE_OPACITY} />
						<Stop offset={0.7} stopColor={rose} stopOpacity={0} />
					</RadialGradient>
				</Defs>
				<Rect
					fill="url(#notify-lock-top)"
					height={height}
					width={w}
					x={0}
					y={0}
				/>
				<Rect
					fill="url(#notify-lock-low)"
					height={height}
					width={w}
					x={0}
					y={0}
				/>
			</Svg>
		</>
	);
}
