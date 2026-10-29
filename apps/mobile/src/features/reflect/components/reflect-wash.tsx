import {
	Blur,
	Canvas,
	Fill,
	SweepGradient,
	vec,
} from "@shopify/react-native-skia";
import { StyleSheet, useWindowDimensions } from "react-native";
import { buildSweepStops } from "@/features/reflect/components/sweep-stops";
import { useTokenColor } from "@/lib/use-token-color";

/** Themed sweep wash behind the reflect idle/typing canvas. */
export const ReflectWash = () => {
	const { width, height } = useWindowDimensions();
	const accent = useTokenColor("accent");
	const surface = useTokenColor("surface-secondary");
	const surfaceTertiary = useTokenColor("surface-tertiary");
	const background = useTokenColor("background");
	const colors = buildSweepStops({
		accent,
		background,
		surface,
		surfaceTertiary,
	});

	return (
		<Canvas pointerEvents="none" style={[styles.canvas, { height, width }]}>
			<Fill>
				<SweepGradient c={vec(width / 2, height / 2)} colors={colors} />
				<Blur blur={55} />
			</Fill>
		</Canvas>
	);
};

const styles = StyleSheet.create({
	canvas: { left: 0, position: "absolute", top: 0 },
});
