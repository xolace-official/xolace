import { Stack } from "expo-router";
import { useOverlayContext } from "stream-chat-expo";
import { BodyFrame, MessagesFailed } from "../parts/chat-frame";
import { HeaderIdentity } from "../parts/header-identity";
import { useChannelScreen } from "./channel-data";
import { CHANNEL } from "./copy";
import { ChannelTitle } from "./header/channel-title";
import { ChannelToolbar } from "./header/channel-toolbar";
import { ChannelMessages } from "./posts/channel-messages";
import { PostSkeleton } from "./posts/post-skeleton";

const IOS = process.env.EXPO_OS === "ios";
const RIGHT_ITEMS = 1;

export function ChannelScreen() {
	const { state, actions } = useChannelScreen();
	const { overlay } = useOverlayContext();
	return (
		<>
			<Stack.Screen
				options={{
					gestureEnabled: overlay === "none",
					headerBackVisible: true,
					headerTitle: IOS ? "" : () => <ChannelTitle />,
					title: CHANNEL.title,
				}}
			/>
			{IOS ? (
				<HeaderIdentity rightItems={RIGHT_ITEMS}>
					<ChannelTitle />
				</HeaderIdentity>
			) : null}
			<ChannelToolbar />
			<BodyFrame>
				{state.body === "messages" ? (
					<ChannelMessages channel={state.channel} />
				) : state.body === "unavailable" ? (
					<MessagesFailed
						message={CHANNEL.failed}
						onRetry={actions.retry}
						retry={CHANNEL.tryAgain}
					/>
				) : (
					<PostSkeleton />
				)}
			</BodyFrame>
		</>
	);
}
