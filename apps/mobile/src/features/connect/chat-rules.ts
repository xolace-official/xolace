/** Chat rules the thread, the profile and the age gate share: production's, unchanged. Pure. */
export type ConversationStatus = "requested" | "open" | "resting" | "closed";

/** Crisis resources from any chat surface, the thread's and the channel's header alike, for
 * whatever the moderation lane (#344) misses. Production's route and source. */
export const CHAT_HELP_HREF = "/crisis-resources?from=xolacer_chat";

/** Whether a message could ever have been exchanged; declined or expired requests never got a
 * channel. */
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

/** The `{ code, max, party, until }` payload of a Convex refusal, or null for any other error. */
export function chatLimitError(error: unknown): {
	code?: string;
	max?: number;
	party?: "seeker" | "xolacer";
	/** The age status an `age_restricted` refusal carries (#716). */
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

/** Whole days until `timestamp`, rounded up and floored at 1 so the last hours never read as "0
 * days". */
export function daysUntil(timestamp: number, now = Date.now()): number {
	return Math.max(1, Math.ceil((timestamp - now) / 86_400_000));
}

/** Replaces the request CTA during a decline cooldown; names the date so the refusal does not
 * read as final. */
export function declineCooldownNote(
	displayName: string,
	until: number,
	now = Date.now()
): string {
	const days = daysUntil(until, now);
	return `${displayName} couldn't take this one on. You can ask them again in ${days} day${days === 1 ? "" : "s"} — others on the roster have space in the meantime.`;
}

/** Why an accept failed. `party` picks the sentence: the accepting xolacer is not always the
 * one who is full. */
export function acceptFailureLabel(error: unknown): string {
	const data = chatLimitError(error);
	if (data?.code !== "open_conversation_limit") {
		return "Couldn't open the conversation. Try again.";
	}
	return data.party === "xolacer"
		? `You're holding ${data.max ?? 8} open conversations. Let one rest before accepting another.`
		: "They've got as many conversations open as they can hold right now. This request stays in your inbox.";
}

/** Rate CTA state shared by the profile card, thread menu and status bar. `hidden` wins over an
 * existing rating. */
export function rateCtaState(input: {
	canRate: boolean;
	myRating?: number;
}): "hidden" | "prompt" | "rated" {
	if (!input.canRate) {
		return "hidden";
	}
	return input.myRating === undefined ? "prompt" : "rated";
}
/** Bubble identity, or null to keep the SDK's shared record (which can leak a seeker's xolacer
 * name); positive match only, so nothing else is impersonated. */
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
