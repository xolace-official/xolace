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
	MessageList,
	ThemeProvider,
	useTheme,
	WithComponents,
} from "stream-chat-expo";
import {
	CHANNEL_ROOT_PROPS,
	minimalMessageActions,
	SUPPORTED_REACTIONS,
	TEXT_ONLY_CAPABILITIES,
} from "../../thread/messages/channel-config";
import {
	ChannelErrorIndicator,
	ConnectionStrip,
} from "../../thread/messages/connection-strip";
import { useThreadStreamStyle } from "../../thread/messages/thread-theme";
import { CHANNEL } from "../copy";
import { ChannelComposer } from "./composer";
import { EmptyChannel } from "./empty-channel";
import { PostCard } from "./post-card";

const OVERRIDES = {
	EmptyStateIndicator: EmptyChannel,
	MessageItemView: PostCard,
	NetworkDownIndicator: ChannelErrorIndicator,
	StickyHeader: noHeader,
};
const noFlag = () => undefined;
function noHeader() {
	return null;
}

export function ChannelMessages({ channel }: { channel: StreamChannel }) {
	const insets = useSafeAreaInsets();
	const { height: windowHeight } = useWindowDimensions();
	const [contentHeight, setContentHeight] = useState(0);
	const { theme } = useTheme();
	const style = useThreadStreamStyle();
	// Measured, as in the thread: Stream's keyboard view under-shoots by the native header.
	const headerOffset = contentHeight ? windowHeight - contentHeight : 0;
	const onLayout = (event: LayoutChangeEvent) =>
		setContentHeight(event.nativeEvent.layout.height);

	return (
		<View className="flex-1" onLayout={onLayout}>
			<ThemeProvider style={style} theme={theme}>
				<WithComponents overrides={OVERRIDES}>
					<Channel
						additionalKeyboardAvoidingViewProps={CHANNEL_ROOT_PROPS}
						additionalTextInputProps={{ placeholder: CHANNEL.placeholder }}
						channel={channel}
						enforceUniqueReaction
						hasCameraPicker={false}
						hasCommands={false}
						hasFilePicker={false}
						hasImagePicker={false}
						keyboardVerticalOffset={headerOffset}
						messageActions={(params) =>
							minimalMessageActions(params, noFlag).filter(
								(action) => action.actionType !== "flagMessage"
							)
						}
						overrideOwnCapabilities={TEXT_ONLY_CAPABILITIES}
						supportedReactions={SUPPORTED_REACTIONS}
						topInset={insets.top}
					>
						<MessageList />
						<ConnectionStrip />
						<ChannelComposer />
					</Channel>
				</WithComponents>
			</ThemeProvider>
		</View>
	);
}
