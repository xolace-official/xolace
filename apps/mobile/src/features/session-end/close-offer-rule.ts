/** Which offer the close phase of session end makes: exactly one, ever. Pure so
 * the invariant is testable without a renderer. */
export type CloseOffer = "pending" | "suggestion" | "plus" | "none";

export function chooseCloseOffer({
	hasSession,
	suggestion,
	waitedOut,
	plusOffer = false,
}: {
	hasSession: boolean;
	/** `undefined` while the query is in flight, `null` when there is none. */
	suggestion: object | null | undefined;
	/** The slot has been held long enough; bounds the wait for a query that never resolves. */
	waitedOut?: boolean;
	/** A proactive Plus moment (1, 4 or 5) cleared the policy module; it competes for the slot. */
	plusOffer?: boolean;
}): CloseOffer {
	// Hold the slot empty rather than swapping a card for a suggestion mid-fade.
	if (hasSession && suggestion === undefined && !waitedOut) {
		return "pending";
	}
	if (suggestion) {
		return "suggestion";
	}
	// Plus loses to a suggestion (#220 §6).
	if (plusOffer) {
		return "plus";
	}
	return "none";
}
