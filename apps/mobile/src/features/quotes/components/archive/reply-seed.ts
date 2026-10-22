import type { Doc } from "@/convex/_generated/dataModel";

/**
 * Whether an open archive card offers to turn its reply into a reflection (#316).
 *
 * Saved + replied is two deliberate keeping gestures, which is what the
 * backward-looking offer assumes. Never on a flagged reply — that card shows
 * the crisis view, and an onward ask would contradict it. Never while a
 * session is already live, or accepting lands the user in a waiting mirror
 * instead of their reply.
 */
export function canSeedReflection(
  quote: Pick<Doc<"daily_quotes">, "reply" | "replyModeration">,
  hasActiveSession: boolean,
): boolean {
  if (hasActiveSession) return false;
  if (!quote.reply?.trim()) return false;
  return !quote.replyModeration?.flagged;
}
