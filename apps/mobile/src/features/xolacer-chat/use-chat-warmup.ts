import { useEffect } from "react";
import {
	chatLocalDataGeneration,
	chatLocalDataSettled,
	hydrateChannelsFromCache,
} from "@/features/xolacer-chat/offline-db";
import type { ConversationList } from "./components/chats-list";
import { useStreamConnection } from "./providers/stream-chat-provider";

/** `queryChannels` caps at 30; rows past the cap (warmed most-recent-first) are never watched,
 * so their unread badge stays blank. Accepted ceiling. */
const MAX_PREFETCH = 30;

/** Opens the connection and fills `client.activeChannels` (offline db first, then
 * `queryChannels`) while the list is read, so a tapped thread paints on its first frame. */
export function useChatWarmup(
	conversations: ConversationList | undefined,
	enabled: boolean
) {
	const { client } = useStreamConnection(enabled);

	const channelIds = (conversations ?? [])
		.filter((conversation) => conversation.streamChannelId)
		.sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0))
		.slice(0, MAX_PREFETCH)
		.map((conversation) => conversation.streamChannelId as string)
		.join(",");

	useEffect(() => {
		if (!(enabled && client && channelIds)) {
			return;
		}
		const ids = channelIds.split(",");
		// Not awaited: only the cache it fills matters. `queryChannels` waits on the
		// socket and rejects if it never opens; offline, the cache read is all that runs.
		let inFlight = false;
		const warm = () => {
			if (inFlight) {
				return;
			}
			inFlight = true;
			// `queryChannels` writes into the offline db, so it waits for any reset
			// and is skipped if one starts meanwhile. See `chatLocalDataSettled`.
			chatLocalDataSettled()
				.then(async (generation) => {
					await hydrateChannelsFromCache(client, ids).catch((error) =>
						console.error("[xolacer-chat] channel cache read failed", error)
					);
					if (generation !== chatLocalDataGeneration()) {
						return;
					}
					await client.queryChannels(
						{ id: { $in: ids }, members: { $in: [client.userID as string] } },
						{ last_message_at: -1 },
						{ limit: MAX_PREFETCH, presence: true, watch: true }
					);
					if (generation !== chatLocalDataGeneration()) {
						return;
					}
					// Stream fires `channels.queried` before `hydrateActiveChannels`, so rows
					// re-reading `countUnread()` on it see zero; re-announced once counts are in.
					client.dispatchEvent({ type: "channels.queried" });
				})
				.catch((error) =>
					console.warn("[xolacer-chat] channel prefetch failed", error)
				)
				.finally(() => {
					inFlight = false;
				});
		};
		warm();
		// Again whenever the socket comes back: the SDK reopens on foreground as a
		// fresh connect, so `connection.recovered` never fires and nothing re-watches;
		// without this, rows and threads keep the state from before backgrounding.
		const { unsubscribe } = client.on("connection.changed", (event) => {
			if (event.online) {
				warm();
			}
		});
		return unsubscribe;
	}, [enabled, client, channelIds]);
}
