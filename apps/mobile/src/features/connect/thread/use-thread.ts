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
	useDismissThreadNotifications(conversationId);
	const stream = useStreamConnection(conversation != null);
	const channel = useThreadChannel(stream.client, conversation);
	const { actions, answering, blocking } = useThreadActions(
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
		state: threadState({
			answering,
			blocking,
			channel,
			conversation,
			stream: stream.status,
		}),
	};
}
