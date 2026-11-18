/**
 * A thread on Convex and Stream: the conversation (seeded from the list), the Stream connection
 * and channel, the counterpart's typing and presence, the tray cleared on the way in, and what
 * the bar and menu do. Production's behaviour; only the look moved.
 */
import type { Id } from "@xolace/backend/dataModel";
import { useStreamConnection } from "@/lib/stream-chat/stream-chat-provider";
import { rateCtaState } from "../chat-rules";
import type { ReportTo, ThreadScreenData } from "./thread-data";
import { statusBar, threadBody, threadSubtitle } from "./thread-model";
import { useCounterpartActivity } from "./use-counterpart-activity";
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
	const activity = useCounterpartActivity(
		conversation?.status === "open" ? conversation.streamChannelId : undefined,
		conversation?.counterpartProfileId ?? ""
	);
	const { actions, ageGate, blocking } = useThreadActions(
		conversation,
		reportTo
	);
	const flag = useFlagMessage(
		conversationId as Id<"xolacer_conversations">,
		stream.client,
		feedbackContext
	);

	const all = { ...actions, flag, retry: stream.retry };
	if (conversation === undefined) {
		return { actions: all, ageGate, state: { phase: "loading" } };
	}
	if (conversation === null) {
		return { actions: all, ageGate, state: { phase: "gone" } };
	}
	return {
		actions: all,
		ageGate,
		state: {
			bar: statusBar(conversation),
			blocking: {
				...blocking,
				history: Boolean(conversation.streamChannelId),
			},
			body: threadBody(conversation, stream.status),
			channel,
			conversation,
			phase: "ready",
			rate: rateCtaState(conversation),
			subtitle: threadSubtitle(conversation, activity, Date.now()),
		},
	};
}
