import type { Doc } from "@xolace/backend/convex/_generated/dataModel";

/** Whether an open archive card offers to turn its reply into a reflection (#316). Never on a
 * flagged reply, never while a session is live. */
export function canSeedReflection(
	quote: Pick<Doc<"daily_quotes">, "reply" | "replyModeration">,
	hasActiveSession: boolean
): boolean {
	if (hasActiveSession) {
		return false;
	}
	if (!quote.reply?.trim()) {
		return false;
	}
	return !quote.replyModeration?.flagged;
}
