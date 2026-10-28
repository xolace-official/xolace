import {
	Canvas,
	ColorMatrix,
	Fill,
	Group,
	Turbulence,
} from "@shopify/react-native-skia";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { useCSSVariable } from "uniwind";
import {
	POSTER_GRADIENT,
	POSTER_GRAIN_OPACITY,
} from "@/features/quotes/poster-palette";

/**
 * The poster surface: fixed gradient, Skia grain, radius, and a fixed edge.
 * `style` positions the card (margin, width); padding belongs to `children`.
 *
 * The edge (hairline + shadow) is deliberately the same on every chrome. It
 * reads as unnecessary on near-black chrome and holds the card together on a
 * light one — do not simplify it away having checked only dark (#302).
 *
 * The shadow lives on an outer view because the clipping one cannot cast it:
 * `overflow: 'hidden'` maps to `masksToBounds` on iOS, which clips the shadow away.
 */
export function PosterSurface({
	children,
	style,
}: {
	children: ReactNode;
	style?: StyleProp<ViewStyle>;
}) {
	const [hairline, shadow] = useCSSVariable([
		"--color-poster-hairline",
		"--color-poster-shadow",
	]) as string[];

	return (
		<View style={[styles.edge, { shadowColor: shadow }, style]}>
			<View style={[styles.clip, { borderColor: hairline }]}>
				<LinearGradient
					colors={POSTER_GRADIENT.stops}
					end={POSTER_GRADIENT.end}
					locations={POSTER_GRADIENT.locations}
					start={POSTER_GRADIENT.start}
					style={StyleSheet.absoluteFill}
				/>
				<Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
					<Group opacity={POSTER_GRAIN_OPACITY}>
						<Fill>
							<Turbulence freqX={0.85} freqY={0.85} octaves={3} seed={7} />
							{/* desaturate the coloured noise to film grain */}
							<ColorMatrix
								// biome-ignore format: 4x5 colour matrix, one row per line
								matrix={[
                  0.33, 0.33, 0.33, 0, 0,
                  0.33, 0.33, 0.33, 0, 0,
                  0.33, 0.33, 0.33, 0, 0,
                  0, 0, 0, 1, 0,
                ]}
							/>
						</Fill>
					</Group>
				</Canvas>
				{children}
			</View>
		</View>
	);
}

const RADIUS = 28;

const styles = StyleSheet.create({
	clip: {
		borderRadius: RADIUS,
		borderWidth: StyleSheet.hairlineWidth,
		overflow: "hidden",
	},
	edge: {
		borderRadius: RADIUS,
		elevation: 8,
		shadowOffset: { height: 8, width: 0 },
		shadowOpacity: 0.18,
		shadowRadius: 24,
	},
});
