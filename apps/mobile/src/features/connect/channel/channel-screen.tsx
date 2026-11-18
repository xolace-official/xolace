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
/** Help, alone on the right. */
const RIGHT_ITEMS = 1;

/**
 * The Xolace channel: announcements to the whole camp as cards, reactions instead of replies
 * (the prototype's `channel-screen.tsx`). Stream's list underneath, so paging, read state and the
 * hold overlay are production's.
 */
export function ChannelScreen() {
	const { state, actions } = useChannelScreen();
	// The hold overlay owns the back swipe while it's up.
	const { overlay } = useOverlayContext();
	return (
		<>
			<Stack.Screen
				options={{
					gestureEnabled: overlay === "none",
					// iOS: the title sits left, after the back button, as the thread's does.
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
