import { useCallback, useSyncExternalStore } from "react";
import { useStreamStatus } from "@/features/xolacer-chat/providers/stream-chat-provider";

/** Live unread count for a row, read from `channel.countUnread()` on every client event.
 * Passive: never opens the socket; counts exist only once `useChatWarmup` watched the channel. */
export function useConversationUnreadCount(
	streamChannelId: string | undefined,
	channelType = "messaging"
) {
	const { client, status } = useStreamStatus();
	const connectedClient = status === "ready" ? client : null;
	const channel =
		connectedClient && streamChannelId
			? connectedClient.channel(channelType, streamChannelId)
			: null;

	// Kept despite the React Compiler, for correctness: a fresh closure re-registers
	// the listener every render. Client-wide and unfiltered on purpose: a read on
	// another device or a message in an unwatched channel never reach a channel listener.
	const hasChannel = channel !== null;
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			if (!(connectedClient && hasChannel)) {
				return () => {};
			}
			const { unsubscribe } = connectedClient.on(onStoreChange);
			return unsubscribe;
		},
		[connectedClient, hasChannel]
	);

	return useSyncExternalStore(subscribe, () => channel?.countUnread() ?? 0);
}
