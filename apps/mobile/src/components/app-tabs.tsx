import { isLiquidGlassAvailable } from "expo-glass-effect";
import {
	NativeTabs,
	type NativeTabsTriggerIconProps,
} from "expo-router/native-tabs";
import { useThemeColor } from "heroui-native";
import { View } from "react-native";
import { MiniPlayerAccessory } from "@/features/browse/now-playing/mini-player-accessory";
import { MiniPlayerOverlay } from "@/features/browse/now-playing/mini-player-overlay";
import { TABS } from "@/features/navigation/tabs";
import { useYouTabIcon } from "@/features/you/avatar/use-you-tab-icon";
import { playSoftPress } from "@/lib/haptics";
import { useMiniPlayerShown } from "@/lib/now-playing/now-playing-store";
import { useUnreadBadge } from "@/lib/stream-chat/use-unread-badge";

const SCREEN_LISTENERS = {
	tabPress: () => {
		playSoftPress();
	},
};

/**
 * The avatar over a tab's own icon. Android keeps the Material glyph: there `md` wins over
 * `src`. No `sf`, since on iOS `sf` would win over the avatar.
 */
function withAvatar(
	icon: NativeTabsTriggerIconProps,
	avatar: NativeTabsTriggerIconProps
): NativeTabsTriggerIconProps {
	return "md" in icon && icon.md ? { ...avatar, md: icon.md } : avatar;
}

export default function AppTabs() {
	const accent = useThemeColor("accent");
	const background = useThemeColor("background");
	const unread = useUnreadBadge();
	const showPlayer = useMiniPlayerShown();
	const avatarIcon = useYouTabIcon();
	const glass = isLiquidGlassAvailable();

	return (
		<View className="flex-1">
			<NativeTabs
				backgroundColor={glass ? undefined : background}
				disableTransparentOnScrollEdge={!glass}
				minimizeBehavior="onScrollDown"
				screenListeners={SCREEN_LISTENERS}
				tintColor={accent}
			>
				{showPlayer && glass && (
					<NativeTabs.BottomAccessory>
						<MiniPlayerAccessory />
					</NativeTabs.BottomAccessory>
				)}
				{TABS.map((tab) => (
					<NativeTabs.Trigger
						disableAutomaticContentInsets={tab.ownInsets}
						key={tab.name}
						name={tab.name}
					>
						<NativeTabs.Trigger.Icon
							{...(tab.avatar && avatarIcon
								? withAvatar(tab.icon, avatarIcon)
								: tab.icon)}
						/>
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
			{showPlayer && !glass && <MiniPlayerOverlay />}
		</View>
	);
}
