export type ConversationStatus = "requested" | "open" | "resting" | "closed";

export const CHAT_HELP_HREF = "/crisis-resources?from=xolacer_chat";

export function hasSpoken(conversation: {
	status: ConversationStatus;
	closedReason?: "declined" | "expired" | "blocked" | "xolacer_left";
}): boolean {
	if (conversation.status === "requested") {
		return false;
	}
	if (conversation.status !== "closed") {
		return true;
	}
	return (
		conversation.closedReason !== "declined" &&
		conversation.closedReason !== "expired"
	);
}

export function chatLimitError(error: unknown): {
	code?: string;
	max?: number;
	party?: "seeker" | "xolacer";
	status?: string;
	until?: number;
} | null {
	const data = (error as { data?: unknown } | null)?.data;
	if (!data || typeof data !== "object") {
		return null;
	}
	return data as {
		code?: string;
		max?: number;
		party?: "seeker" | "xolacer";
		status?: string;
		until?: number;
	};
}

/** Compares against now: the server's `retryAvailableAt` comes from a cached reactive query and
 * can already be in the past. */
export function declineCooldownActive(
	until: number | undefined,
	now = Date.now()
): until is number {
	return until !== undefined && until > now;
}

export function daysUntil(timestamp: number, now = Date.now()): number {
	return Math.max(1, Math.ceil((timestamp - now) / 86_400_000));
}

export function declineCooldownNote(
	displayName: string,
	until: number,
	now = Date.now()
): string {
	const days = daysUntil(until, now);
	return `${displayName} couldn't take this one on. You can ask them again in ${days} day${days === 1 ? "" : "s"} — others on the roster have space in the meantime.`;
}

export function acceptFailureLabel(error: unknown): string {
	const data = chatLimitError(error);
	if (data?.code !== "open_conversation_limit") {
		return "Couldn't open the conversation. Try again.";
	}
	return data.party === "xolacer"
		? `You're holding ${data.max ?? 8} open conversations. Let one rest before accepting another.`
		: "They've got as many conversations open as they can hold right now. This request stays in your inbox.";
}

export function rateCtaState(input: {
	canRate: boolean;
	myRating?: number;
}): "hidden" | "prompt" | "rated" {
	if (!input.canRate) {
		return "hidden";
	}
	return input.myRating === undefined ? "prompt" : "rated";
}
export function resolveMessageIdentity(
	senderId: string | undefined,
	conversation: {
		counterpartProfileId: string;
		counterpartName: string;
		counterpartPhotoUrl?: string;
	}
): { name: string; image?: string } | null {
	if (senderId !== conversation.counterpartProfileId) {
		return null;
	}
	return {
		image: conversation.counterpartPhotoUrl,
		name: conversation.counterpartName,
	};
}
