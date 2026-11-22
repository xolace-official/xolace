import * as Sentry from "@sentry/react-native";
import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import type { Channel, StreamChat } from "stream-chat";
import { hydrateChannelsFromCache } from "@/lib/stream-chat/offline-db";
import type { ThreadConversation } from "./thread-model";

export function useLocalChannelState(channel: Channel | null) {
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
			if (!myUserId || event.user?.id !== myUserId) {
				return;
			}
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
