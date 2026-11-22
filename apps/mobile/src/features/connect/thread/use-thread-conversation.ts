import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import { useQuery } from "convex/react";
import type { ThreadConversation } from "./thread-model";

export function useThreadConversation(
	conversationId: string
): ThreadConversation | null | undefined {
	const conversation = useQuery(api.xolacerChat.getConversation, {
		conversationId: conversationId as Id<"xolacer_conversations">,
	});

	const rows = useQuery(
		api.xolacerChat.myConversations,
		conversation === undefined ? {} : "skip"
	);

	if (conversation !== undefined) {
		return conversation;
	}

	const row = rows
		?.filter((candidate) => candidate.kind === "pair")
		.find((candidate) => candidate.id === conversationId);
	if (!row) {
		return undefined;
	}

	return {
		...row,
		canRate: false,
		myRating: undefined,
		origin: row.origin,
		restingReason: row.restingReason,
		resumable: false,
		seeded: true,
	};
}
