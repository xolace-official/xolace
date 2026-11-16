import { isLiquidGlassAvailable } from "expo-glass-effect";
import { NativeTabs } from "expo-router/native-tabs";
import { useThemeColor } from "heroui-native";
import { Platform, View } from "react-native";
import { MiniPlayerAccessory } from "@/features/browse/now-playing/mini-player-accessory";
import { MiniPlayerOverlay } from "@/features/browse/now-playing/mini-player-overlay";
import { useMiniPlayerShown } from "@/features/browse/now-playing/now-playing-store";
import { V2_TABS } from "@/features/navigation/tabs";
import { useUnreadBadge } from "@/features/xolacer-chat/use-unread-badge";
import { playSoftPress } from "@/lib/haptics";
import { useTabBarHidden } from "@/lib/tab-bar";

const SCREEN_LISTENERS = {
	tabPress: () => {
		playSoftPress();
	},
};

/**
 * The v2 shell: `V2_TABS` on NativeTabs, Liquid Glass on iOS 26, minimizing on
 * scroll down. The old shell is `components/app-tabs.tsx`; the `(tabs)` layout
 * picks one per launch.
 */
export function TabShell() {
	const accent = useThemeColor("accent");
	const background = useThemeColor("background");
	// Yielded to a screen raising a bottom toolbar: the two share the same strip.
	const hidden = useTabBarHidden();
	const unread = useUnreadBadge();
	const showPlayer = useMiniPlayerShown();
	// iOS 26 docks the player in the bar; elsewhere (iOS below 26, Android) it floats above it.
	const nativeAccessory = isLiquidGlassAvailable();

	return (
		<View className="flex-1">
			<NativeTabs
				// iOS draws its own bar (glass on 26, blur before); Android's takes the theme.
				backgroundColor={Platform.OS === "android" ? background : undefined}
				hidden={hidden}
				minimizeBehavior="onScrollDown"
				screenListeners={SCREEN_LISTENERS}
				tintColor={accent}
			>
				{showPlayer && nativeAccessory && (
					<NativeTabs.BottomAccessory>
						<MiniPlayerAccessory />
					</NativeTabs.BottomAccessory>
				)}
				{V2_TABS.map((tab) => (
					<NativeTabs.Trigger
						disableAutomaticContentInsets={tab.ownInsets}
						key={tab.name}
						name={tab.name}
					>
						<NativeTabs.Trigger.Icon {...tab.icon} />
						<NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
						{tab.badge === "unread" && (
							// No children at zero: `hidden` alone still painted a "0".
							<NativeTabs.Trigger.Badge hidden={!unread}>
								{unread ? String(unread) : undefined}
							</NativeTabs.Trigger.Badge>
						)}
					</NativeTabs.Trigger>
				))}
			</NativeTabs>
			{showPlayer && !nativeAccessory && <MiniPlayerOverlay />}
		</View>
	);
}
