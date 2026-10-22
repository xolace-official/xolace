import { Doc } from "../_generated/dataModel";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { revenuecat } from "../revenuecat";

// =============================================================
// SERVER SEAM — single source of truth for entitlement checks.
// Every server-side gate reads through here. Callers already hold
// the profile doc from requireAuth(), so no extra DB lookup.
//
// appUserId = profile._id (= emotionalProfileId). Stable across data
// wipes (dataWipe.ts never deletes the profile row), but NOT across
// full account deletion: jobs/accountDeletion.ts purges the profile
// row after the grace period, so a user who deletes, gets purged, and
// signs back in receives a fresh profile id — RC then sees a new,
// unrelated appUserId. Prior entitlement history under the old id is
// orphaned on RC's side; the store receipt still belongs to their
// Apple/Google account, so "Restore purchases" reattaches any active
// subscription to the new id (no double-billing, but RC-side history
// and analytics under the old id don't carry over).
// =============================================================

export const PLUS_ENTITLEMENT_ID = "xolace-plus";

export type PremiumTier = "free" | "plus";

/**
 * Authoritative premium check. Two coexisting phases:
 *  - Phase A (RC unconfigured): PREMIUM_DEV_OVERRIDE=true forces true;
 *    otherwise the component has no data and returns false → everyone free.
 *  - Phase B (RC live): reads mirrored entitlement state from the component.
 * The dev override is the only switch needed pre-config; nothing else changes
 * when RC goes live.
 */
export async function hasPremium(
  ctx: QueryCtx | MutationCtx,
  profile: Doc<"emotional_profiles">,
): Promise<boolean> {
  if (process.env.PREMIUM_DEV_OVERRIDE === "true") return true;
  return await revenuecat.hasEntitlement(ctx, {
    appUserId: profile._id,
    entitlementId: PLUS_ENTITLEMENT_ID,
  });
}

/**
 * Convenience wrapper returning both the boolean and the tier label,
 * for surfaces that render tier-aware copy.
 */
export async function getTier(
  ctx: QueryCtx | MutationCtx,
  profile: Doc<"emotional_profiles">,
): Promise<{ isPremium: boolean; tier: PremiumTier }> {
  const isPremium = await hasPremium(ctx, profile);
  return { isPremium, tier: isPremium ? "plus" : "free" };
}

/**
 * Throwing guard for mutations that must never proceed without Plus.
 * The client mirrors the gate optimistically, but this is the real fence.
 */
export async function requirePremium(
  ctx: QueryCtx | MutationCtx,
  profile: Doc<"emotional_profiles">,
  feature: string,
): Promise<void> {
  if (!(await hasPremium(ctx, profile))) {
    throw new Error(`Xolace+ required: ${feature}`);
  }
}
