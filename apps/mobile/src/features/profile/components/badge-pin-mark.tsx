import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { View } from "react-native";

const MARK_SIZE = 20;
const ICON_SIZE = 11;

/** The small pin on a pinned badge's top-right (#699). Sits inside a `relative` parent. */
export function PinMark() {
	const accentForeground = useThemeColor("accent-foreground") as string;
	return (
		<View
			accessibilityElementsHidden
			className="absolute top-0 right-0 items-center justify-center rounded-full bg-accent"
			importantForAccessibility="no-hide-descendants"
			style={{ height: MARK_SIZE, width: MARK_SIZE }}
		>
			<SymbolView
				name={{ android: "keep", ios: "pin.fill", web: "keep" }}
				size={ICON_SIZE}
				tintColor={accentForeground}
			/>
		</View>
	);
}
