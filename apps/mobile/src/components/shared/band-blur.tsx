import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient as MaskGradient } from "expo-linear-gradient";
import { type ColorValue, Platform, StyleSheet, View } from "react-native";
import { BlurView, LinearGradient } from "@/components/shared/styled";
import { useScheme } from "@/design/scheme";

const INTENSITY = 40;
const MASK_STOPS = [
	[0, 1],
	[0.31, 0.8],
	[0.62, 0.4],
	[1, 0],
] as const;
const SAMPLES = 16;
const TINT = Platform.OS === "android" ? 0.96 : 0.92;

type Props = {
	solid: number;
	height: number;
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
