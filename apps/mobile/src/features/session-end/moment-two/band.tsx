import { Canvas, Group } from "@shopify/react-native-skia";
import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import type { SessionColors } from "../session-colors";
import { LINES, STAR, YOU } from "./band-geo";
import { BandLine, BandSlot } from "./band-lines";
import { BandStar, YouStar } from "./band-stars";

const PAD = 24;
const BAND_H = 90;

type Props = {
	ox: number;
	top: number;
	W: number;
	colors: SessionColors;
	ink3: string;
	reduced: boolean;
	c2: SharedValue<number>;
	cs: SharedValue<number>;
	warm: SharedValue<number>;
	gone: SharedValue<number>;
	breath: SharedValue<number>;
};

export function Band({
	ox,
	top,
	W,
	colors,
	ink3,
	reduced,
	c2,
	cs,
	warm,
	gone,
	breath,
}: Props) {
	const col = colors.stars;
	return (
		<View
			accessibilityElementsHidden
			className="absolute left-0"
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={{ height: BAND_H + PAD * 2, top: top - PAD, width: W }}
		>
			<Canvas
				style={{
					height: BAND_H + PAD * 2,
					left: 0,
					position: "absolute",
					top: 0,
					width: W,
				}}
			>
				<Group transform={[{ translateX: ox }, { translateY: PAD }]}>
					{LINES.map((_, k) => (
						<BandLine color={col[k]} cs={cs} k={k} key={k} reduced={reduced} />
					))}
					<BandSlot
						c2={c2}
						gone={gone}
						ink3={ink3}
						reduced={reduced}
						warm={warm}
						warmColor={colors.youWarm}
					/>
				</Group>
			</Canvas>
			{STAR.map(([x, y], k) => (
				<BandStar
					c2={c2}
					color={col[k]}
					cs={cs}
					k={k}
					key={k}
					reduced={reduced}
					x={ox + x}
					y={PAD + y}
				/>
			))}
			<YouStar
				breath={breath}
				colors={colors}
				cs={cs}
				reduced={reduced}
				x={ox + YOU.x}
				y={PAD + YOU.y}
			/>
		</View>
	);
}
