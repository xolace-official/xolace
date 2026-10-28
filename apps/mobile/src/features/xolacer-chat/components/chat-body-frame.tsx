import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useHeaderHeight } from "expo-router/react-navigation";
import type { ReactNode } from "react";
import { Platform, View } from "react-native";

/** Starts the chat body below the header: iOS 26's Liquid Glass header is transparent and
 * content starts at y=0, which also skews the keyboard offset `ThreadMessages` measures. */
export function ChatBodyFrame({ children }: { children: ReactNode }) {
	const headerHeight = useHeaderHeight();
	const underGlassHeader = Platform.OS === "ios" && isLiquidGlassAvailable();

	return (
		<View
			className="flex-1 bg-background"
			style={{ paddingTop: underGlassHeader ? headerHeight : 0 }}
		>
			{children}
		</View>
	);
}
