import { CHAT_REQUEST_SUBTITLE } from "@xolace/backend/convex/lib/chatNotifications";
import type { ConversationList } from "./chats-list";

type Conversation = ConversationList[number];

export type RowPresentation = {
	chip: { label: string; tone: "warn" | "muted" } | null;
	/** Line 2. Null means the row is a single line — only `open` gets there. */
	statusLine: string | null;
	/** A xolacer's incoming request. Lives in the badge slot, which a request can never occupy. */
	requestDot: boolean;
	mutedAvatar: boolean;
};

const NONE = {
	chip: null,
	mutedAvatar: false,
	requestDot: false,
	statusLine: null,
};

/** Everything a row decides in one place: pill, sentence, request dot, greyed avatar. */
export function rowPresentation(conversation: Conversation): RowPresentation {
	if (conversation.status === "open") {
		return NONE;
	}

	if (conversation.status === "requested") {
		const isXolacer = conversation.role === "xolacer";
		return {
			chip: { label: isXolacer ? "New request" : "Waiting", tone: "warn" },
			mutedAvatar: false,
			requestDot: isXolacer,
			statusLine: isXolacer
				? conversation.origin === "suggestion"
					? "Just after a session"
					: CHAT_REQUEST_SUBTITLE
				: `Request sent, ${conversation.counterpartName} will reply when they can`,
		};
	}

	if (conversation.status === "resting") {
		// An absent reason predates the field and reads as quiet.
		const manual = conversation.restingReason === "manual";
		return {
			chip: { label: manual ? "Wrapped up" : "Resting", tone: "muted" },
			// Not muted: a greyed-out row would contradict the copy telling you it
			// can be picked back up.
			mutedAvatar: false,
			requestDot: false,
			statusLine: manual
				? conversation.role === "xolacer"
					? "You wrapped this up, it can still be picked back up"
					: `${conversation.counterpartName} wrapped this up, pick it back up anytime`
				: "Gone quiet, pick it back up anytime",
		};
	}

	return {
		chip: { label: "Closed", tone: "muted" },
		mutedAvatar: true,
		requestDot: false,
		statusLine: closedLine(conversation),
	};
}

function closedLine(conversation: Conversation): string {
	if (conversation.closedReason === "declined") {
		return conversation.role === "xolacer"
			? "You closed this request"
			: `${conversation.counterpartName} couldn't take this one on`;
	}
	if (conversation.closedReason === "expired") {
		return "This request quietly expired";
	}
	// Blocked and left-xolacer rows are never "still here to read"; the
	// fallthrough is a plain close with no reason recorded.
	if (
		conversation.closedReason === "blocked" ||
		conversation.closedReason === "xolacer_left"
	) {
		return "This conversation is closed";
	}
	return "Everything you two wrote is still here";
}
