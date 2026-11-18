/**
 * A thread on Convex and Stream: the conversation (seeded from the list), the Stream connection
 * and channel, the tray cleared on the way in, and what the bar and menu do. The counterpart's
 * typing and presence stay out: the header's title reads them (`ThreadTitle`). Production's behaviour; only the look moved.
 */
import type { Id } from "@xolace/backend/dataModel";
import { useStreamConnection } from "@/lib/stream-chat/stream-chat-provider";
import type { ReportTo, ThreadScreenData } from "./thread-data";
import { threadState } from "./thread-model";
import { useDismissThreadNotifications } from "./use-dismiss-thread-notifications";
import { type FeedbackContext, useFlagMessage } from "./use-flag-message";
import { useThreadActions } from "./use-thread-actions";
import { useThreadChannel } from "./use-thread-channel";
import { useThreadConversation } from "./use-thread-conversation";

export function useThread(
	conversationId: string,
	reportTo: ReportTo,
	feedbackContext: FeedbackContext
): ThreadScreenData {
	const conversation = useThreadConversation(conversationId);
	// Before the loading branches: the tray clears on the way in, not once the row lands.
	useDismissThreadNotifications(conversationId);
	// Usually a no-op (Connect already connected); matters for a push deep link or a cold launch.
	const stream = useStreamConnection(conversation != null);
	const channel = useThreadChannel(stream.client, conversation);
	const { actions, ageGate, blocking } = useThreadActions(
		conversation,
		reportTo
	);
	const flag = useFlagMessage(
		conversationId as Id<"xolacer_conversations">,
		stream.client,
		feedbackContext
	);

	return {
		actions: { ...actions, flag, retry: stream.retry },
		ageGate,
		state: threadState({
			blocking,
			channel,
			conversation,
			stream: stream.status,
		}),
	};
}
