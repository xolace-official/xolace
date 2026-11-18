import { View } from "react-native";
import {
	NetworkDownIndicator,
	useChannelContext,
	useChatContext,
} from "stream-chat-expo";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { useTokenColor } from "@/lib/use-token-color";
import { THREAD } from "../copy";

const OFFLINE = { android: "wifi_off", ios: "wifi.slash" } as const;

/** The live socket state, above the composer: a quiet strip, muted text on the well. Must sit
 * under a mounted `<Chat>` (`useChatContext` throws outside one). */
export function OfflineStrip() {
	const { connectionRecovering, isOnline } = useChatContext();
	const muted = useTokenColor("muted");
	if (isOnline !== false) {
		return null;
	}
	return (
		<View
			accessibilityLiveRegion="polite"
			className="mx-3 mb-1.5 flex-row items-center gap-2 rounded-row bg-surface-secondary px-3.5 py-2.5"
		>
			<Icon color={muted} name={OFFLINE} size={13} />
			<AppText className="flex-1" color="muted" variant="footnote">
				{connectionRecovering ? THREAD.reconnecting : THREAD.offlineStrip}
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
