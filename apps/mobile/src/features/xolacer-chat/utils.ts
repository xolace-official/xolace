export type ConversationStatus = "requested" | "open" | "resting" | "closed";

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

/** Past this the badge shows `99+`. */
const UNREAD_CAP = 99;

/** Only open and resting threads carry unread; rows also use this to skip subscribing. */
export function canHoldUnread(status: ConversationStatus): boolean {
	return status === "open" || status === "resting";
}

/** Unread badge for a conversation row, or null. `label` caps at 99+; `a11y` never caps. */
export function unreadBadge(
	status: ConversationStatus,
	count: number
): { label: string; a11y: string } | null {
	if (!canHoldUnread(status)) {
		return null;
	}
	return formatUnreadBadge(count);
}

/** `unreadBadge` without the lifecycle gate, for the Xolace broadcast row (#377). */
export function formatUnreadBadge(
	count: number
): { label: string; a11y: string } | null {
	if (count <= 0) {
		return null;
	}
	return {
		a11y: `${count} unread message${count === 1 ? "" : "s"}`,
		label: count > UNREAD_CAP ? `${UNREAD_CAP}+` : String(count),
	};
}

/** The `{ code, max, party, until }` payload of a Convex refusal, or null for any other error. */
export function chatLimitError(error: unknown): {
	code?: string;
	max?: number;
	party?: "seeker" | "xolacer";
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
		until?: number;
	};
}

/** Compares against now: the server's `retryAvailableAt` comes from a cached reactive query and
 * can already be in the past. */
export function declineCooldownActive(
	until: number | undefined
): until is number {
	return until !== undefined && until > Date.now();
}

/** Whole days until `timestamp`, rounded up and floored at 1 so the last hours never read as "0
 * days". */
export function daysUntil(timestamp: number): number {
	return Math.max(1, Math.ceil((timestamp - Date.now()) / 86_400_000));
}

/** Replaces the request CTA during a decline cooldown; names the date so the refusal does not
 * read as final. */
export function declineCooldownNote(
	displayName: string,
	until: number
): string {
	const days = daysUntil(until);
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
