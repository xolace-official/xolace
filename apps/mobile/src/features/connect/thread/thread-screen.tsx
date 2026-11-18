import { Stack } from "expo-router";
import { View } from "react-native";
import { useOverlayContext } from "stream-chat-expo";
import { AppText } from "@/components/shared/app-text";
import { AgeGateSheet } from "../age-gate/age-gate-sheet";
import { BodyFrame, MessagesFailed } from "../parts/chat-frame";
import { StatusBar } from "./bar/status-bar";
import { THREAD } from "./copy";
import {
	BlockDialog,
	ThreadTitle,
	ThreadToolbar,
} from "./header/thread-chrome";
import { ThreadMessages } from "./messages/thread-messages";
import { ThreadSkeleton } from "./messages/thread-skeleton";
import { useThreadScreen } from "./thread-data";

/** A centred note in the thread's body. */
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

/** The conversation: the header carries who, how they are, help and the menu; the body is
 * Stream's list and composer, or the bar that stands in for the composer. */
export function ThreadScreen() {
	const { state, actions, ageGate } = useThreadScreen();
	// The long-press overlay owns the back swipe while it's up.
	const { overlay } = useOverlayContext();

	return (
		<>
			<Stack.Screen
				options={{
					gestureEnabled: overlay === "none",
					headerTitle:
						state.phase === "ready"
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
			<ThreadToolbar />
			<BodyFrame>
				<ThreadBody />
			</BodyFrame>
			<BlockDialog />
			<AgeGateSheet gate={ageGate} />
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
			{/* While Stream comes up an open thread keeps the composer's room; on the error path a
			    composer would promise a send that can't happen. */}
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
