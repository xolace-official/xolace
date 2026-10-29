import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import type { ThreadConversation } from "./components/thread-screen";

/** The thread's conversation, seeded from the list it was tapped in; `undefined` when there is
 * nothing to seed from (deep link, cold launch). */
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

	// The broadcast row routes through `/xolace-channel` and has no `xolacer_conversations` id.
	const row = rows
		?.filter((candidate) => candidate.kind === "pair")
		.find((candidate) => candidate.id === conversationId);
	if (!row) {
		return undefined;
	}

	// `resumable`, `canRate` and `myRating` are reads the list does not make; the
	// seed is marked so only the status bar waits for them (#342).
	return {
		...row,
		canRate: false,
		myRating: undefined,
		// Not redundant with the spread: `...row` leaves `origin` optional, and
		// ThreadConversation requires the key to be present even when undefined.
		origin: row.origin,
		restingReason: row.restingReason,
		resumable: false,
		seeded: true,
	};
}
