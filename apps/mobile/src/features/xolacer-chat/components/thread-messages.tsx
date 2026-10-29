import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import {
	type LayoutChangeEvent,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Channel as StreamChannel } from "stream-chat";
import {
	Channel,
	MessageComposer,
	MessageList,
	useChatContext,
	WithComponents,
} from "stream-chat-expo";
import { ComposerPlaceholder } from "@/features/xolacer-chat/components/composer-placeholder";
import { ConversationIdentityProvider } from "@/features/xolacer-chat/components/message-author";
import { OfflineStrip } from "@/features/xolacer-chat/components/offline-strip";
import { SafetyStrip } from "@/features/xolacer-chat/components/safety-strip";
import {
	CHANNEL_ROOT_PROPS,
	COMPONENT_OVERRIDES,
	minimalMessageActions,
	SUPPORTED_REACTIONS,
	TEXT_ONLY_CAPABILITIES,
} from "@/features/xolacer-chat/components/thread-channel-config";
import type { ThreadConversation } from "@/features/xolacer-chat/components/thread-screen";
import { ThreadSkeleton } from "@/features/xolacer-chat/components/thread-skeleton";
import { ThreadStatusBar } from "@/features/xolacer-chat/components/thread-status-bar";
import { hydrateChannelsFromCache } from "@/features/xolacer-chat/offline-db";
import { useFlagMessage } from "@/features/xolacer-chat/use-flag-message";

/** The message surface, mounted once `Chat` holds a usable client; split out so the screen's
 * Convex chrome renders first. */
export function ThreadMessages({
	conversation,
}: {
	conversation: ThreadConversation;
}) {
	const { client } = useChatContext();
	const { streamChannelId } = conversation;
	const insets = useSafeAreaInsets();
	const { height: windowHeight } = useWindowDimensions();
	const [contentHeight, setContentHeight] = useState(0);

	// Stream's KeyboardCompatibleView compares its own layout height (starting
	// below the native header) with the keyboard's screen Y, so the shift under-shoots
	// by the header height. Measured: the header grows with subtitle, notch and island.
	const headerOffset = contentHeight ? windowHeight - contentHeight : 0;
	const onContentLayout = (event: LayoutChangeEvent) =>
		setContentHeight(event.nativeEvent.layout.height);

	// Channel identity must stay stable across renders — `<Channel>` treats a new
	// instance as a new conversation. This memo is for correctness, not perf, so
	// it stays despite the React Compiler being enabled.
	const channel = useMemo(
		() => client.channel("messaging", streamChannelId as string),
		[client, streamChannelId]
	);

	const hasLocalState = useLocalChannelState(channel);
	useTouchOnSend(channel, conversation, client.userID);
	const flagMessage = useFlagMessage(conversation.id);

	// `client.channel()` returns an empty handle and `<Channel>` renders before it
	// watches, so mounting now paints "No chats here yet" and "can't send" for a
	// frame. The skeleton holds until the channel has state from somewhere.
	if (!hasLocalState) {
		return (
			<View className="flex-1 bg-background">
				<SafetyStrip />
				<ThreadSkeleton />
				{conversation.status === "open" ? <ComposerPlaceholder /> : null}
			</View>
		);
	}

	return (
		// Wrapper exists to measure the content box; Channel's own root is the
		// view whose height Stream mis-compares against the keyboard frame.
		<View className="flex-1" onLayout={onContentLayout}>
			{/* Module-level constant: WithComponents reads `overrides` once at mount
        and silently ignores a fresh object each render, which is why the avatar
        override reads its conversation from the context below. */}
			<WithComponents overrides={COMPONENT_OVERRIDES}>
				<ConversationIdentityProvider conversation={conversation}>
					<Channel
						additionalKeyboardAvoidingViewProps={CHANNEL_ROOT_PROPS}
						channel={channel}
						// One reaction per person per message; picking another swaps it.
						enforceUniqueReaction
						hasCameraPicker={false}
						// And the button survives on slash commands alone — a messaging
						// channel ships with giphy enabled by default.
						hasCommands={false}
						hasFilePicker={false}
						hasImagePicker={false}
						// Must be explicit: Channel destructures both with no default, so
						// omitting them passes `undefined`, not 0.
						keyboardVerticalOffset={headerOffset}
						messageActions={(params) =>
							minimalMessageActions(params, flagMessage)
						}
						overrideOwnCapabilities={TEXT_ONLY_CAPABILITIES}
						supportedReactions={SUPPORTED_REACTIONS}
						topInset={insets.top}
					>
						<SafetyStrip />
						<MessageList />
						{conversation.status === "open" ? (
							<>
								<OfflineStrip />
								<MessageComposer />
							</>
						) : (
							<ThreadStatusBar conversation={conversation} />
						)}
					</Channel>
				</ConversationIdentityProvider>
			</WithComponents>
		</View>
	);
}

/** True once the channel holds state: already live, hydrated from the offline db, or watched.
 * Failure resolves too, so Stream's error indicator shows instead of an endless skeleton. */
export function useLocalChannelState(channel: StreamChannel) {
	// Only the settled cid: success just needs the re-render, and the cid makes
	// a channel swap re-gate instead of inheriting the verdict.
	const [settledCid, setSettledCid] = useState<string | null>(null);

	useEffect(() => {
		if (channel.initialized || channel.offlineMode) {
			return;
		}
		let alive = true;
		const client = channel.getClient();
		hydrateChannelsFromCache(client, [channel.id as string])
			.then(() => {
				if (channel.offlineMode) {
					return;
				}
				return channel.watch({ presence: true });
			})
			.catch((error) =>
				console.error("[xolacer-chat] channel load failed", error)
			)
			.finally(() => {
				if (alive) {
					setSettledCid(channel.cid);
				}
			});
		return () => {
			alive = false;
		};
	}, [channel]);

	return (
		channel.initialized || channel.offlineMode || settledCid === channel.cid
	);
}

/** Keeps `lastMessageAt` current so the resting sweep measures real silence; the `message.new`
 * webhook only stamps a throttled notified-at and cannot replace it. */
function useTouchOnSend(
	channel: StreamChannel,
	conversation: ThreadConversation,
	// From the socket, not Convex: same value, one less field to load before mount.
	myUserId: string | undefined
) {
	const touchConversation = useMutation(api.xolacerChat.touchConversation);
	const { id, status } = conversation;

	useEffect(() => {
		if (status !== "open") {
			return;
		}
		const { unsubscribe } = channel.on("message.new", (event) => {
			// The `!myUserId` half matters: without it an id-less event would match
			// an id-less user and touch on the counterpart's message.
			if (!myUserId || event.user?.id !== myUserId) {
				return;
			}
			touchConversation({ conversationId: id }).catch((error) =>
				console.error("[xolacer-chat] touch failed", error)
			);
		});
		return unsubscribe;
	}, [channel, id, status, myUserId, touchConversation]);
}
