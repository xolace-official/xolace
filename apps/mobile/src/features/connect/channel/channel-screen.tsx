import { Stack } from "expo-router";
import { useOverlayContext } from "stream-chat-expo";
import { BodyFrame, MessagesFailed } from "../parts/chat-frame";
import { useChannelScreen } from "./channel-data";
import { CHANNEL } from "./copy";
import { ChannelTitle } from "./header/channel-title";
import { ChannelMessages } from "./posts/channel-messages";
import { PostSkeleton } from "./posts/post-skeleton";

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
					headerTitle: () => <ChannelTitle />,
					title: CHANNEL.title,
				}}
			/>
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
