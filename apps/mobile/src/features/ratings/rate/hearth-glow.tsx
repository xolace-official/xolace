import { StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import type { Ember } from "./ember-scene";

const AT_Y = 0.19;
const RX = 0.78;
const RY = 0.3;
const MID_STOP = 0.42;
const CLEAR_STOP = 0.78;

export function HearthGlow({ ember }: { ember: Ember }) {
	const { width, height } = useWindowDimensions();
	return (
		<Svg
			height={height}
			pointerEvents="none"
			style={StyleSheet.absoluteFill}
			width={width}
		>
			<Defs>
				<RadialGradient
					cx={width / 2}
					cy={height * AT_Y}
					gradientUnits="userSpaceOnUse"
					id="hearth"
					rx={width * RX}
					ry={height * RY}
				>
					<Stop offset={0} stopColor={ember["rate-glow-core"]} />
					<Stop offset={MID_STOP} stopColor={ember["rate-glow-mid"]} />
					<Stop
						offset={CLEAR_STOP}
						stopColor={ember["rate-page"]}
						stopOpacity={0}
					/>
				</RadialGradient>
			</Defs>
			<Rect fill="url(#hearth)" height={height} width={width} x={0} y={0} />
		</Svg>
	);
}
