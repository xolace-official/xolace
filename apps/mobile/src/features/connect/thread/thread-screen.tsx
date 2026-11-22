import { Stack } from "expo-router";
import { View } from "react-native";
import { useOverlayContext } from "stream-chat-expo";
import { AppText } from "@/components/shared/app-text";
import { BodyFrame, MessagesFailed } from "../parts/chat-frame";
import { StatusBar } from "./bar/status-bar";
import { THREAD } from "./copy";
import {
	BlockDialog,
	ThreadIdentity,
	ThreadTitle,
	ThreadToolbar,
} from "./header/thread-chrome";
import { ThreadMessages } from "./messages/thread-messages";
import { ThreadSkeleton } from "./messages/thread-skeleton";
import { useThreadScreen } from "./thread-data";

const IOS = process.env.EXPO_OS === "ios";

function Note({ title, body }: { title?: string; body: string }) {
	return (
		<View className="flex-1 items-center justify-center gap-2 px-10">
			{title ? (
				<AppText center variant="headline">
					{title}
				</AppText>
			) : null}
			<AppText center color="muted" variant="callout">
				{body}
			</AppText>
		</View>
	);
}

export function ThreadScreen() {
	const { state, actions } = useThreadScreen();
	const { overlay } = useOverlayContext();

	return (
		<>
			<Stack.Screen
				options={{
					gestureEnabled: overlay === "none",
					headerBackVisible: true,
					headerTitle:
						state.phase === "ready" && !IOS
							? () => (
									<ThreadTitle
										channel={state.channel}
										conversation={state.conversation}
										onOpenProfile={actions.openProfile}
									/>
								)
							: "",
					title:
						state.phase === "ready" ? state.conversation.counterpartName : "",
				}}
			/>
			<ThreadIdentity />
			<ThreadToolbar />
			<BodyFrame>
				<ThreadBody />
			</BodyFrame>
			<BlockDialog />
		</>
	);
}

function ThreadBody() {
	const { state, actions } = useThreadScreen();
	if (state.phase === "loading") {
		return <ThreadSkeleton />;
	}
	if (state.phase === "gone") {
		return (
			<Note body={THREAD.unavailable.body} title={THREAD.unavailable.title} />
		);
	}
	const { body, bar, conversation, channel } = state;
	if (body.kind === "messages" && channel) {
		return <ThreadMessages channel={channel} conversation={conversation} />;
	}
	return (
		<>
			{body.kind === "no-channel" ? (
				<Note body={body.note} />
			) : body.kind === "unavailable" ? (
				<MessagesFailed
					message={THREAD.messagesFailed}
					onRetry={actions.retry}
					retry={THREAD.tryAgain}
				/>
			) : (
				<ThreadSkeleton />
			)}
			{conversation.status === "open" ? (
				body.kind === "unavailable" ? null : (
					<ComposerRoom />
				)
			) : (
				<StatusBar bar={bar} />
			)}
		</>
	);
}

function ComposerRoom() {
	return (
		<View className="px-3 pt-1.5 pb-safe-or-4">
			<View className="h-13 rounded-[26px] bg-surface-secondary" />
		</View>
	);
}
