import {
	XOLACE_BROADCAST_CHANNEL_TYPE,
	XOLACE_CHANNEL_ID,
} from "@xolace/backend/convex/lib/streamSetup";
import { Stack } from "expo-router";
import { useMemo, useState } from "react";
import {
	type LayoutChangeEvent,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	Channel,
	MessageList,
	useChatContext,
	useOverlayContext,
	WithComponents,
} from "stream-chat-expo";
import { AppText } from "@/components/shared/app-text";
import { useStreamConnection } from "../providers/stream-chat-provider";
import { ChatBodyFrame } from "./chat-body-frame";
import { OfflineStrip } from "./offline-strip";
import { SafetyStrip } from "./safety-strip";
import {
	CHANNEL_ROOT_PROPS,
	COMPONENT_OVERRIDES,
	minimalMessageActions,
	SUPPORTED_REACTIONS,
	TEXT_ONLY_CAPABILITIES,
} from "./thread-channel-config";
import { useLocalChannelState } from "./thread-messages";
import { MessagesUnavailable } from "./thread-screen";
import { ThreadSkeleton } from "./thread-skeleton";
import {
	BroadcastComposerBar,
	BroadcastMessageAuthor,
	BroadcastMessageFooter,
} from "./xolace-channel-overrides";
import { XolacerAvatar } from "./xolacer-avatar";

// The fixed, no-lifecycle channel every camper is a member of (#372-#375): no
// `xolacer_conversations` row, every author is Xolace. Only the sender's membership
// carries `create-message` (`DESIRED_XOLACE_BROADCAST`); Stream hides the composer for others.

// Reactors here are every camper, not a resolved counterpart: without the
// identity override the "who reacted" sheet shows Stream's pseudonymous names
// instead of hiding every non-self row. The rest of the map is a safe no-op.
const {
	MessageUserReactionsItem: _reactionIdentityOverride,
	...BROADCAST_OVERRIDES_BASE
} = COMPONENT_OVERRIDES;

/** Same identity as the chats-list row (#377), rendered into the native header's title slot
 * like `ThreadHeader`. */
function XolaceChannelHeader() {
	return (
		<View className="flex-row items-center gap-2.5">
			<XolacerAvatar campfire name="Xolace" size="sm" />
			<View className="min-w-0 shrink">
				<AppText
					className="font-semibold text-foreground text-sm"
					numberOfLines={1}
				>
					Xolace
				</AppText>
				<AppText className="mt-px text-[11px] text-muted" numberOfLines={1}>
					Camp announcements
				</AppText>
			</View>
		</View>
	);
}

const BROADCAST_OVERRIDES = {
	...BROADCAST_OVERRIDES_BASE,
	MessageAuthor: BroadcastMessageAuthor,
	MessageFooter: BroadcastMessageFooter,
};

export function XolaceChannelScreen() {
	const { status: streamStatus, retry } = useStreamConnection();
	const { overlay } = useOverlayContext();

	return (
		<>
			<Stack.Screen
				options={{
					gestureEnabled: overlay === "none",
					// eslint-disable-next-line react/no-unstable-nested-components -- navigation header render prop, not a mounted subtree
					headerTitle: () => <XolaceChannelHeader />,
					title: "Xolace",
				}}
			/>
			<ChatBodyFrame>
				{streamStatus === "ready" ? (
					<XolaceChannelMessages />
				) : (
					<View className="flex-1 bg-background">
						<SafetyStrip />
						{streamStatus === "connecting" ? (
							<ThreadSkeleton />
						) : (
							<MessagesUnavailable onRetry={retry} />
						)}
					</View>
				)}
			</ChatBodyFrame>
		</>
	);
}

function XolaceChannelMessages() {
	const { client } = useChatContext();
	const insets = useSafeAreaInsets();
	const { height: windowHeight } = useWindowDimensions();
	const [contentHeight, setContentHeight] = useState(0);

	// See `ThreadMessages` for why this offset is measured rather than assumed.
	const headerOffset = contentHeight ? windowHeight - contentHeight : 0;
	const onContentLayout = (event: LayoutChangeEvent) =>
		setContentHeight(event.nativeEvent.layout.height);

	const channel = useMemo(
		() => client.channel(XOLACE_BROADCAST_CHANNEL_TYPE, XOLACE_CHANNEL_ID),
		[client]
	);
	const hasLocalState = useLocalChannelState(channel);

	if (!hasLocalState) {
		return (
			<View className="flex-1 bg-background">
				<SafetyStrip />
				<ThreadSkeleton />
			</View>
		);
	}

	return (
		<View className="flex-1" onLayout={onContentLayout}>
			<WithComponents overrides={BROADCAST_OVERRIDES}>
				<Channel
					additionalKeyboardAvoidingViewProps={CHANNEL_ROOT_PROPS}
					channel={channel}
					enforceUniqueReaction
					hasCameraPicker={false}
					hasCommands={false}
					hasFilePicker={false}
					hasImagePicker={false}
					keyboardVerticalOffset={headerOffset}
					// No `useFlagMessage` here — that mutation is keyed on
					// `xolacer_conversations` and would throw for this channel.
					messageActions={(params) =>
						minimalMessageActions(params, () => {}).filter(
							(action) => action.actionType !== "flagMessage"
						)
					}
					overrideOwnCapabilities={TEXT_ONLY_CAPABILITIES}
					supportedReactions={SUPPORTED_REACTIONS}
					topInset={insets.top}
				>
					<SafetyStrip />
					<MessageList />
					<OfflineStrip />
					<BroadcastComposerBar />
				</Channel>
			</WithComponents>
		</View>
	);
}
