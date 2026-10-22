import type { Doc } from "../_generated/dataModel";

type PoolabilityInputs = Pick<
  Doc<"sessions">,
  "kept" | "contributedReflection" | "safeguardLevel"
>;

/**
 * May this session's text enter the shared anonymous peer pool?
 * The single most safety-critical predicate in the product — the one place
 * "may user text leave their private space" is decided. Kept in one owner so
 * a new gate (e.g. a future `redacted` flag) is added in exactly one place.
 *
 * - kept === true            — user chose to keep the reflection
 * - contributedReflection    — fresh consent; re-checked at run time because the
 *                              user can revoke the opt-in between opt-in and run
 * - safeguardLevel !== crisis — crisis sessions must never enter the pool
 */
export function isPoolable(s: PoolabilityInputs): boolean {
  return (
    s.kept === true &&
    s.contributedReflection === true &&
    s.safeguardLevel !== "crisis"
  );
}

/**
 * May a follow-up "what helped?" reflection (#449) enter the pool? Its own
 * consent is the share toggle; the source session's crisis gate still holds,
 * and an acute or escalation-derived card never shares. The text is distilled
 * before it lands.
 */
export function isFollowUpPoolable(r: {
  shareRequested: boolean;
  reflectionText?: string;
  tier: Doc<"follow_up_cards">["tier"];
  escalationDerived: boolean;
  safeguardLevel: Doc<"sessions">["safeguardLevel"];
}): boolean {
  return (
    r.shareRequested &&
    !!r.reflectionText &&
    r.tier !== "acute" &&
    !r.escalationDerived &&
    r.safeguardLevel !== "crisis"
  );
}
