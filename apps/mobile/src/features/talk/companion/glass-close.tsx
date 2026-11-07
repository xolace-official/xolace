// A sheet's close button as a glass circle (liquid glass on iOS 26, frosted elsewhere),
// like Claude's voice settings sheet.

import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { Pressable } from "react-native";
import { GlassSurface } from "@/components/shared/glass-surface";

const SIZE = 40;
const HIT_SLOP = 6;

export function GlassClose({ onPress }: { onPress: () => void }) {
	const foreground = useThemeColor("foreground");
	return (
		<GlassSurface interactive radius={SIZE / 2}>
			<Pressable
				accessibilityLabel="Close"
				accessibilityRole="button"
				className="items-center justify-center"
				hitSlop={HIT_SLOP}
				onPress={onPress}
				style={{ height: SIZE, width: SIZE }}
			>
				<SymbolView
					name={{ android: "close", ios: "xmark" }}
					size={15}
					tintColor={foreground}
					weight="semibold"
				/>
			</Pressable>
		</GlassSurface>
	);
}
