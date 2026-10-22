import {
	Blur,
	Canvas,
	Group,
	matchFont,
	Paint,
	Rect,
	Text,
} from "@shopify/react-native-skia";
import { View } from "react-native";
import { useTokenColor } from "../hooks/use-token-color";

const W = 44;
const H = 24;

// A count badge, same footprint whether locked or unlocked. Locked rows show
// a representative value behind a static blur — readable as "a number lives
// here" without revealing it. Unlocked rows (row's real word already crossed
// the wire) show the real count in the clear.
export function FrostedCount({
	value,
	locked = true,
}: {
	value: number;
	locked?: boolean;
}) {
	const accent = useTokenColor("accent");
	const muted = useTokenColor("muted");

	const font = matchFont({
		fontFamily: "Poppins",
		fontSize: 13,
		fontStyle: "normal",
		fontWeight: "600",
	});

	const label = String(value);
	const textWidth = font.measureText
		? font.measureText(label).width
		: label.length * 7;
	const x = (W - textWidth) / 2;
	const y = H / 2 + 4.5;

	return (
		<View
			className="overflow-hidden rounded-lg border"
			style={{ borderColor: muted + "1F", height: H, width: W }}
		>
			<Canvas style={{ height: H, width: W }}>
				<Rect color={accent + "12"} height={H} width={W} x={0} y={0} />
				{locked ? (
					// eslint-disable-next-line react-perf/jsx-no-jsx-as-prop -- Skia <Group layer> requires a Paint JSX element; React Compiler stabilizes it
					<Group
						layer={
							<Paint>
								<Blur blur={4} />
							</Paint>
						}
					>
						<Text color={muted + "E6"} font={font} text={label} x={x} y={y} />
					</Group>
				) : (
					<Text color={accent + "E6"} font={font} text={label} x={x} y={y} />
				)}
			</Canvas>
		</View>
	);
}
