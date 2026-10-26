import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useHeaderHeight } from "expo-router/react-navigation";
import type { ReactNode } from "react";
import { Platform, View } from "react-native";

/**
 * Starts the chat body below the native header on every platform.
 *
 * On iOS 26 a header with no background of its own is the Liquid Glass system
 * bar, which the native stack lays out as transparent: the screen's content
 * starts at y=0, under the status bar and the header. iOS 18 and Android keep
 * an opaque header and start the content below it. Without this frame the
 * safety strip lands under the clock on iOS 26, and Stream's keyboard offset
 * (measured from the body's height in `ThreadMessages`) is off by the header.
 */
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
