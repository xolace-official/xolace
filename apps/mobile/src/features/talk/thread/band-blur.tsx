import MaskedViewClass from "@react-native-masked-view/masked-view";
import { LinearGradient as MaskGradient } from "expo-linear-gradient";
import type { ComponentType, ReactElement } from "react";
import {
	type ColorValue,
	Platform,
	StyleSheet,
	View,
	type ViewProps,
} from "react-native";
import { BlurView, LinearGradient } from "@/components/shared/styled";
import { useScheme } from "@/design/scheme";

// The package's class typings predate React 19's JSX types; the component itself is fine.
const MaskedView = MaskedViewClass as unknown as ComponentType<
	ViewProps & { maskElement: ReactElement }
>;

/**
 * The fade under Talk's header (the prototype's Today band). Production's
 * `components/shared/top-blur.tsx` recipe: one native blur under an
 * eased alpha mask, with the page tint over it. Here the band is solid at full
 * strength down to `solid`, then both fade to nothing. One blur costs a third of
 * the three-level version it replaced, with no visible difference under the tint.
 * Android gets the tint only: a BlurView under a MaskedView is unreliable there.
 */
const INTENSITY = 40;
/** top-blur's eased mask across the fade: 1 → .8 → .4 → 0. */
const MASK_STOPS = [
	[0, 1],
	[0.31, 0.8],
	[0.62, 0.4],
	[1, 0],
] as const;
/** Gradient stops across the fade; enough that the smoothstep reads as a curve. */
const SAMPLES = 16;
/** The page tint over the blur where it is solid (Android: no blur, so a firmer tint). */
const TINT = Platform.OS === "android" ? 0.96 : 0.92;

type Props = {
	/** Full strength from the top down to here (pt). */
	solid: number;
	/** Total height; the blur and tint reach zero here. */
	height: number;
	/** Page colour, `#RRGGBB`. */
	page: string;
};

export function BandBlur({ solid, height, page }: Props) {
	const scheme = useScheme();
	const fade = height - solid;
	const ys = [
		0,
		solid,
		...Array.from(
			{ length: SAMPLES },
			(_, i) => solid + (fade * (i + 1)) / SAMPLES
		),
	];
	const rgb = hexRgb(page);
	const tint = gradient(
		ys.map(
			(y) =>
				`rgba(${rgb},${TINT * smoothstep(y <= solid ? 1 : 1 - (y - solid) / fade, 0, 1)})`
		)
	);
	const tintAt = loc(ys.map((y) => y / height));
	const maskAt = loc([
		0,
		...MASK_STOPS.map(([at]) => (solid + fade * at) / height),
	]);
	const mask = gradient([
		"rgba(0,0,0,1)",
		...MASK_STOPS.map(([, a]) => `rgba(0,0,0,${a})`),
	]);

	return (
		<View
			accessibilityElementsHidden
			className="absolute inset-0"
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
		>
			{Platform.OS === "ios" && (
				// MaskedView takes no className, and its mask stays the plain gradient: the mask element
				// is rendered off-screen by the native view, so it keeps a plain style.
				<MaskedView
					maskElement={
						<MaskGradient
							colors={mask}
							locations={maskAt}
							style={StyleSheet.absoluteFill}
						/>
					}
					pointerEvents="none"
					style={StyleSheet.absoluteFill}
				>
					<BlurView
						className="absolute inset-0"
						intensity={INTENSITY}
						tint={scheme === "dark" ? "dark" : "light"}
					/>
				</MaskedView>
			)}
			<LinearGradient
				className="absolute inset-0"
				colors={tint}
				locations={tintAt}
			/>
		</View>
	);
}

function smoothstep(v: number, from: number, to: number): number {
	const t = Math.max(0, Math.min(1, (v - from) / (to - from)));
	return t * t * (3 - 2 * t);
}

function hexRgb(hex: string): string {
	const n = Number.parseInt(hex.slice(1, 7), 16);
	return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function gradient(
	colors: string[]
): readonly [ColorValue, ColorValue, ...ColorValue[]] {
	return colors as unknown as readonly [
		ColorValue,
		ColorValue,
		...ColorValue[],
	];
}

function loc(stops: number[]): readonly [number, number, ...number[]] {
	return stops as unknown as readonly [number, number, ...number[]];
}
