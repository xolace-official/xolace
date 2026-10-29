import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { Stack } from "expo-router";
import { Button } from "heroui-native";
import { View } from "react-native";
import { useOverlayContext } from "stream-chat-expo";
import { AppText } from "@/components/shared/app-text";
import { useStreamConnection } from "../providers/stream-chat-provider";
import { useDismissThreadNotifications } from "../use-dismiss-thread-notifications";
import { useThreadConversation } from "../use-thread-conversation";
import { rateCtaState } from "../utils";
import { ChatBodyFrame } from "./chat-body-frame";
import { ComposerPlaceholder } from "./composer-placeholder";
import { SafetyStrip } from "./safety-strip";
import { ThreadHeader } from "./thread-header";
import { ThreadMessages } from "./thread-messages";
import { ThreadSkeleton } from "./thread-skeleton";
import { ThreadStatusBar } from "./thread-status-bar";
import { XolacerMenu } from "./xolacer-menu";

/** `myStreamUserId` is dropped: `client.userID` carries the same value, which lets the list
 * seed this shape. The server still returns it for older clients. */
export type ThreadConversation = Omit<
	NonNullable<FunctionReturnType<typeof api.xolacerChat.getConversation>>,
	"myStreamUserId"
> & {
	/** Set by the list seed: `resumable`, `canRate` and `myRating` are placeholders until the
	 * real row lands, so the status bar holds its space. */
	seeded?: true;
};

export function ThreadScreen({ conversationId }: { conversationId: string }) {
	const conversation = useThreadConversation(conversationId);

	// Above the loading branches on purpose: the tray should clear on the way in,
	// not once the conversation has finished loading.
	useDismissThreadNotifications(conversationId);

	if (conversation === undefined) {
		return (
			<ChatBodyFrame>
				<ThreadSkeleton />
			</ChatBodyFrame>
		);
	}
	if (conversation === null) {
		return <ThreadUnavailable />;
	}
	return <ThreadBody conversation={conversation} />;
}

function ThreadBody({ conversation }: { conversation: ThreadConversation }) {
	// Usually a no-op (the Connect tab already connected); matters on paths that
	// skip it: a push deep link or a cold launch into this route.
	const { status: streamStatus, retry } = useStreamConnection();

	const { overlay } = useOverlayContext();

	// A sibling of every branch so the title is set on the first frame and
	// survives the connecting → ready swap. The menu is mounted unconditionally,
	// never `hidden`, which leaves a touch-eating band across the top on Android.
	const header = (
		<>
			<Stack.Screen
				options={{
					gestureEnabled: overlay === "none",
					// eslint-disable-next-line react/no-unstable-nested-components -- navigation header render prop, not a mounted subtree
					headerTitle: () => <ThreadHeader conversation={conversation} />,
					title: conversation.counterpartName,
				}}
			/>
			<XolacerMenu
				conversationId={conversation.id}
				hasHistory={Boolean(conversation.streamChannelId)}
				name={conversation.counterpartName}
				origin="thread"
				profileId={conversation.counterpartProfileId}
				rateState={rateCtaState(conversation)}
			/>
		</>
	);

	const body = () => {
		// No channel before accept: header plus waiting/accept bar, no Stream needed.
		if (!conversation.streamChannelId) {
			return (
				<View className="flex-1 bg-background">
					<SafetyStrip />
					<View className="flex-1 items-center justify-center px-10">
						<AppText className="text-center text-[13px] text-muted leading-5">
							{conversation.status === "closed"
								? "Nothing was said here."
								: conversation.role === "xolacer"
									? "Nothing has been said yet, the conversation opens once you accept."
									: "Messages will appear here once your request is accepted."}
						</AppText>
					</View>
					<ThreadStatusBar conversation={conversation} />
				</View>
			);
		}

		// Chrome is Convex-driven and stays put while Stream comes up. `ready` waits
		// only on the offline db, so the skeleton is a flash; `unavailable` lingers.
		if (streamStatus !== "ready") {
			return (
				<View className="flex-1 bg-background">
					<SafetyStrip />
					{streamStatus === "connecting" ? (
						<ThreadSkeleton />
					) : (
						<MessagesUnavailable onRetry={retry} />
					)}
					{conversation.status === "open" ? (
						// Only while connecting: on the error path a composer stub would
						// promise a send that cannot happen.
						streamStatus === "connecting" ? (
							<ComposerPlaceholder />
						) : null
					) : (
						<ThreadStatusBar conversation={conversation} />
					)}
				</View>
			);
		}

		return <ThreadMessages conversation={conversation} />;
	};

	return (
		<>
			{header}
			<ChatBodyFrame>{body()}</ChatBodyFrame>
		</>
	);
}

export function MessagesUnavailable({ onRetry }: { onRetry: () => void }) {
	return (
		<View className="flex-1 items-center justify-center gap-4 px-10">
			<AppText className="text-center text-[13px] text-muted leading-5">
				Messages couldn&apos;t load. Check your connection and try again.
			</AppText>
			<Button onPress={onRetry} size="sm" variant="secondary">
				Try again
			</Button>
		</View>
	);
}

function ThreadUnavailable() {
	return (
		<View className="flex-1 items-center justify-center gap-2 bg-background px-10">
			<AppText className="font-semibold text-[15px] text-foreground">
				This conversation isn&apos;t here
			</AppText>
			<AppText className="text-center text-[13px] text-muted leading-5">
				It may have been closed, or it isn&apos;t yours to open.
			</AppText>
		</View>
	);
}
