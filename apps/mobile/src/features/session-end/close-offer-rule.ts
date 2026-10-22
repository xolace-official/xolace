/**
 * Which offer the close phase of session end makes. Exactly one, ever.
 *
 * Pure so the invariant is testable without a renderer: a suggestion and Plus
 * must never be on screen together.
 */
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
  /**
   * The slot has been held as long as it is worth holding. Bounds the wait so
   * a query that never resolves — offline, or auth not yet hydrated — falls
   * back to no offer instead of holding the slot empty forever.
   */
  waitedOut?: boolean;
  /**
   * A proactive Plus moment (1, 4 or 5) has cleared the policy module for this
   * close. Competes in this slot rather than adding a card — the invariant is
   * one offer, and a sell stacked on top of an offer is two.
   */
  plusOffer?: boolean;
}): CloseOffer {
  // Hold the slot empty rather than showing something and swapping it for a
  // suggestion mid-fade — two offers in sequence is the same problem as two
  // offers at once.
  if (hasSession && suggestion === undefined && !waitedOut) return "pending";
  if (suggestion) return "suggestion";
  // Plus loses to a suggestion (#220 §6): a stranger who might help beats a
  // purchase.
  if (plusOffer) return "plus";
  return "none";
}
