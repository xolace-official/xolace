import * as Sentry from "@sentry/react-native";
/**
 * The thread's Stream channel: one stable handle per channel id, held back until it has state
 * (live, from the offline db, or watched), and `touchConversation` on each message you send so the
 * resting sweep measures real silence. Production's, unchanged.
 */
import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import type { Channel, StreamChat } from "stream-chat";
import { hydrateChannelsFromCache } from "@/lib/stream-chat/offline-db";
import type { ThreadConversation } from "./thread-model";

/** True once the channel holds state: already live, hydrated from the offline db, or watched.
 * Failure resolves too, so Stream's error indicator shows instead of an endless skeleton. */
function useLocalChannelState(channel: Channel | null) {
	const [settledCid, setSettledCid] = useState<string | null>(null);

	useEffect(() => {
		if (!channel || channel.initialized || channel.offlineMode) {
			return;
		}
		let alive = true;
		hydrateChannelsFromCache(channel.getClient(), [channel.id as string])
			.then(() =>
				channel.offlineMode ? undefined : channel.watch({ presence: true })
			)
			// Offline it fails, and the list stands on the cache with the offline strip: expected,
			// so not reported.
			.catch((error: unknown) => {
				if (__DEV__) {
					console.error("[connect] channel load failed", error);
				}
			})
			.finally(() => {
				if (alive) {
					setSettledCid(channel.cid);
				}
			});
		return () => {
			alive = false;
		};
	}, [channel]);

	return Boolean(
		channel &&
			(channel.initialized || channel.offlineMode || settledCid === channel.cid)
	);
}

/** Keeps `lastMessageAt` current; the `message.new` webhook only stamps a throttled notified-at. */
function useTouchOnSend(
	channel: Channel | null,
	conversation: ThreadConversation | null | undefined,
	myUserId: string | undefined
) {
	const touch = useMutation(api.xolacerChat.touchConversation);
	const id = conversation?.id;
	const open = conversation?.status === "open";

	useEffect(() => {
		if (!(channel && id && open)) {
			return;
		}
		const { unsubscribe } = channel.on("message.new", (event) => {
			// The `!myUserId` half: an id-less event must never match an id-less user.
			if (!myUserId || event.user?.id !== myUserId) {
				return;
			}
			// A lost touch leaves the Chats list's order and preview stale.
			touch({ conversationId: id }).catch((error: unknown) =>
				Sentry.captureException(error, { tags: { action: "touch" } })
			);
		});
		return unsubscribe;
	}, [channel, id, open, myUserId, touch]);
}

export function useThreadChannel(
	client: StreamChat | null,
	conversation: ThreadConversation | null | undefined
) {
	const channelId = conversation?.streamChannelId;
	// Stable identity is correctness, not speed: `<Channel>` treats a new instance as a new
	// conversation, so this memo stays despite the React Compiler.
	const channel = useMemo(
		() => (client && channelId ? client.channel("messaging", channelId) : null),
		[client, channelId]
	);
	const ready = useLocalChannelState(channel);
	useTouchOnSend(channel, conversation, client?.userID);
	return ready ? channel : null;
}
