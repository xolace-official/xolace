import { SymbolView, type SymbolWeight } from "expo-symbols";
import type { ComponentProps } from "react";
import type { ColorValue, StyleProp, ViewStyle } from "react-native";

/**
 * An SF Symbol name, or `{ ios, android }` to draw on Android too (Material
 * Symbols). A bare SF name draws nothing on Android.
 */
export type IconName = ComponentProps<typeof SymbolView>["name"];

type Props = {
	name: IconName;
	size?: number;
	color: ColorValue;
	weight?: SymbolWeight;
	style?: StyleProp<ViewStyle>;
};

const DEFAULT_SIZE = 20;

export function Icon({
	name,
	size = DEFAULT_SIZE,
	color,
	weight = "medium",
	style,
}: Props) {
	return (
		<SymbolView
			accessibilityElementsHidden
			importantForAccessibility="no"
			name={name}
			resizeMode="scaleAspectFit"
			size={size}
			style={[{ height: size, width: size }, style]}
			tintColor={color}
			weight={weight}
		/>
	);
}
