import { isLiquidGlassAvailable } from "expo-glass-effect";
import { NativeTabs } from "expo-router/native-tabs";
import { useThemeColor } from "heroui-native";
import { View } from "react-native";
import { MiniPlayerAccessory } from "@/features/browse/now-playing/mini-player-accessory";
import { MiniPlayerOverlay } from "@/features/browse/now-playing/mini-player-overlay";
import { useMiniPlayerShown } from "@/features/browse/now-playing/now-playing-store";
import { useUnreadBadge } from "@/features/xolacer-chat/use-unread-badge";
import { playSoftPress } from "@/lib/haptics";
import { useTabBarHidden } from "@/lib/tab-bar";

/** Tab surface: a sibling stack entry to reflect (index), reached via router.replace so "/"
 * stays the landing. */
export default function AppTabs() {
	const background = useThemeColor("background");
	const accent = useThemeColor("accent");
	// Yielded to a screen raising a bottom toolbar — the two share the same strip.
	const hidden = useTabBarHidden();
	// Stream's total across every conversation, the same number as the app icon. Null reads as
	// nothing.
	const unread = useUnreadBadge();
	const showPlayer = useMiniPlayerShown();
	// iOS 26 docks the player in the bar; elsewhere it floats above it.
	const nativeAccessory = isLiquidGlassAvailable();

	const screenListeners = {
		tabPress: () => {
			playSoftPress();
		},
	};

	return (
		<View className="flex-1">
			<NativeTabs
				backgroundColor={background}
				disableTransparentOnScrollEdge
				hidden={hidden}
				minimizeBehavior="onScrollDown"
				screenListeners={screenListeners}
				tintColor={accent}
			>
				{showPlayer && nativeAccessory && (
					<NativeTabs.BottomAccessory>
						<MiniPlayerAccessory />
					</NativeTabs.BottomAccessory>
				)}
				<NativeTabs.Trigger name="discovery">
					<NativeTabs.Trigger.Icon
						md="explore"
						sf={{ default: "safari", selected: "safari.fill" }}
					/>
					<NativeTabs.Trigger.Label>Discovery</NativeTabs.Trigger.Label>
				</NativeTabs.Trigger>
				{/* Catalogue browse (#338, paths-v1.md §9.3): the one override of the no-new-tab
			    map rule (decision 19). */}
				<NativeTabs.Trigger name="browse">
					<NativeTabs.Trigger.Icon
						md="grid_view"
						sf={{
							default: "square.grid.2x2",
							selected: "square.grid.2x2.fill",
						}}
					/>
					<NativeTabs.Trigger.Label>Browse</NativeTabs.Trigger.Label>
				</NativeTabs.Trigger>
				<NativeTabs.Trigger name="connect">
					<NativeTabs.Trigger.Icon
						md="forum"
						sf={{
							default: "bubble.left.and.bubble.right",
							selected: "bubble.left.and.bubble.right.fill",
						}}
					/>
					<NativeTabs.Trigger.Label>Connect</NativeTabs.Trigger.Label>
					{/* No children at zero: `hidden` alone still painted a "0". */}
					<NativeTabs.Trigger.Badge hidden={!unread}>
						{unread ? String(unread) : undefined}
					</NativeTabs.Trigger.Badge>
				</NativeTabs.Trigger>
			</NativeTabs>
			{showPlayer && !nativeAccessory && <MiniPlayerOverlay />}
		</View>
	);
}
