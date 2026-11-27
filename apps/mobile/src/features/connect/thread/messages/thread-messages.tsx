import { useState } from "react";
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
	ThemeProvider,
	useTheme,
	WithComponents,
} from "stream-chat-expo";
import { StatusBar } from "../bar/status-bar";
import { THREAD } from "../copy";
import { useThreadScreen } from "../thread-data";
import type { ThreadConversation } from "../thread-model";
import {
	CHANNEL_ROOT_PROPS,
	COMPONENT_OVERRIDES,
	minimalMessageActions,
	SUPPORTED_REACTIONS,
	TEXT_ONLY_CAPABILITIES,
} from "./channel-config";
import { ConnectionStrip } from "./connection-strip";
import { ConversationIdentityProvider } from "./message-identity";
import { useThreadStreamStyle } from "./thread-theme";

export function ThreadMessages({
	conversation,
	channel,
}: {
	conversation: ThreadConversation;
	channel: StreamChannel;
}) {
	const { actions, state } = useThreadScreen();
	const insets = useSafeAreaInsets();
	const { height: windowHeight } = useWindowDimensions();
	const [contentHeight, setContentHeight] = useState(0);
	const { theme } = useTheme();
	const style = useThreadStreamStyle();

	// Stream's KeyboardCompatibleView compares its own layout height (starting below the native
	// header) with the keyboard's screen Y, so it under-shoots by the header: measured, since the
	// header grows with its subtitle, the notch and the island.
	const headerOffset = contentHeight ? windowHeight - contentHeight : 0;
	const onLayout = (event: LayoutChangeEvent) =>
		setContentHeight(event.nativeEvent.layout.height);

	return (
		// The wrapper measures the content box; Channel's own root is the view Stream
		// mis-compares against the keyboard frame.
		<View className="flex-1" onLayout={onLayout}>
			<ThemeProvider style={style} theme={theme}>
				{/* Module-level overrides: WithComponents reads them once at mount, so the
				    avatar override reads its conversation from the context below. */}
				<WithComponents overrides={COMPONENT_OVERRIDES}>
					<ConversationIdentityProvider conversation={conversation}>
						<Channel
							additionalKeyboardAvoidingViewProps={CHANNEL_ROOT_PROPS}
							additionalTextInputProps={{
								placeholder: THREAD.placeholder(conversation.counterpartName),
							}}
							channel={channel}
							enforceUniqueReaction
							hasCameraPicker={false}
							hasCommands={false}
							hasFilePicker={false}
							hasImagePicker={false}
							// Must be explicit: Channel passes `undefined`, not 0, when omitted.
							keyboardVerticalOffset={headerOffset}
							messageActions={(params) =>
								minimalMessageActions(params, actions.flag)
							}
							overrideOwnCapabilities={TEXT_ONLY_CAPABILITIES}
							supportedReactions={SUPPORTED_REACTIONS}
							topInset={insets.top}
						>
							<MessageList />
							{conversation.status === "open" ? (
								<>
									<ConnectionStrip />
									<MessageComposer />
								</>
							) : state.phase === "ready" ? (
								<StatusBar bar={state.bar} />
							) : null}
						</Channel>
					</ConversationIdentityProvider>
				</WithComponents>
			</ThemeProvider>
		</View>
	);
}
