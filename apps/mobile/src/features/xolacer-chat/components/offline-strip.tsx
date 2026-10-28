import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { View } from "react-native";
import {
	NetworkDownIndicator,
	useChannelContext,
	useChatContext,
} from "stream-chat-expo";
import { AppText } from "@/components/shared/app-text";

const OFFLINE_ICON = {
	android: "wifi_off",
	ios: "wifi.slash",
	web: "wifi_off",
} as const;

/** Reports the live socket state; `streamStatus` only says how the connect attempt went. Must
 * sit under a mounted `<Chat>`, since `useChatContext` throws outside one. */
export function OfflineStrip() {
	const { connectionRecovering, isOnline } = useChatContext();
	const muted = useThemeColor("muted") as string;

	if (isOnline !== false) {
		return null;
	}

	return (
		<View className="flex-row items-center gap-2 border-border/40 border-t bg-surface-secondary px-4 py-2">
			<SymbolView name={OFFLINE_ICON} size={13} tintColor={muted} />
			<AppText className="flex-1 text-[11px] text-muted">
				{connectionRecovering
					? "Reconnecting — hold onto that for a second."
					: "You're offline. Messages won't send until the connection is back."}
			</AppText>
		</View>
	);
}

/** Stream's `NetworkDownIndicator` with its offline half removed: `OfflineStrip` owns that, and
 * the stock one flashes during NetInfo's initial `null` window. */
export function ChannelErrorIndicator() {
	const { error } = useChannelContext();
	const { isOnline } = useChatContext();

	if (!(isOnline && error)) {
		return null;
	}
	return <NetworkDownIndicator />;
}
