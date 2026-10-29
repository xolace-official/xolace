import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView, type BlurViewProps } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColor } from "heroui-native";
import { Platform, StyleSheet, View } from "react-native";
import { cn } from "@/lib/utils";

type Props = {
	position?: "top" | "bottom";
	height?: number;
	blurViewProps?: BlurViewProps;
};

// Top/bottom fade-to-blur edge. The iOS mask gradient is a luminance mask, not UI
// colour. Android gets an opaque scrim: expo-blur has no working backdrop blur there
// (`dimezisBlurView` leaves content sharp on API 35).
export function ProgressiveBlurView({
	position = "top",
	height = 100,
	blurViewProps,
}: Props) {
	const backgroundColor = useThemeColor("background") as string;
	const isTop = position === "top";

	// MaskedView takes the mask as an element; React Compiler memoizes it.
	const mask = (
		// eslint-disable-next-line react-perf/jsx-no-jsx-as-prop
		<LinearGradient
			colors={
				isTop
					? ["black", "#00000080", "transparent"]
					: ["transparent", "#00000080", "black"]
			}
			locations={isTop ? [0.5, 0.75, 1] : [0, 0.25, 0.5]}
			style={StyleSheet.absoluteFill}
		/>
	);

	return (
		<View
			className={cn(
				"pointer-events-none absolute right-0 left-0",
				isTop ? "top-0" : "bottom-0"
			)}
			style={{ height }}
		>
			{Platform.OS === "android" ? (
				<LinearGradient
					colors={
						isTop
							? [backgroundColor, backgroundColor, `${backgroundColor}00`]
							: [`${backgroundColor}00`, backgroundColor, backgroundColor]
					}
					locations={isTop ? [0, 0.55, 1] : [0, 0.45, 1]}
					style={StyleSheet.absoluteFill}
				/>
			) : (
				<MaskedView maskElement={mask} style={StyleSheet.absoluteFill}>
					<BlurView
						intensity={blurViewProps?.intensity ?? 70}
						style={[StyleSheet.absoluteFill, blurViewProps?.style]}
						{...blurViewProps}
					/>
				</MaskedView>
			)}
		</View>
	);
}
