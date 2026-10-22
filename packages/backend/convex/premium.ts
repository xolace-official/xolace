import { v } from "convex/values";
import { query, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth } from "./lib/auth";
import { hasPremium, PLUS_ENTITLEMENT_ID } from "./lib/premium";
import { hasInsights } from "./compounding/insightStore";
import { posthog } from "./posthog";

// =============================================================
// PREMIUM — client entitlement query + RevenueCat lifecycle hooks.
// The query is the client counterpart of hasPremium(); the hooks are
// fired by the webhook ingestion in convex/revenuecat.ts.
// =============================================================

// Mirror the component's Store / OwnershipType literal unions so the
// hook signatures satisfy EntitlementActivatedHook / *DeactivatedHook.
const storeValidator = v.union(
  v.literal("AMAZON"),
  v.literal("APP_STORE"),
  v.literal("MAC_APP_STORE"),
  v.literal("GALAXY"),
  v.literal("PADDLE"),
  v.literal("PLAY_STORE"),
  v.literal("PROMOTIONAL"),
  v.literal("RC_BILLING"),
  v.literal("ROKU"),
  v.literal("STRIPE"),
  v.literal("TEST_STORE"),
  v.literal("EXTERNAL"),
  v.literal("UNKNOWN_STORE"),
);

const ownershipTypeValidator = v.union(
  v.literal("PURCHASED"),
  v.literal("FAMILY_SHARED"),
  v.literal("UNKNOWN"),
);

/**
 * Reactive server truth for the client. Flips the instant a webhook
 * lands. Returns appUserId so the client passes the same id to
 * Purchases.logIn() — RC appUserId must match what the server checks.
 */
export const getEntitlement = query({
  args: {},
  returns: v.object({
    isPlus: v.boolean(),
    tier: v.union(v.literal("plus"), v.literal("free")),
    appUserId: v.id("emotional_profiles"),
  }),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    const isPlus = await hasPremium(ctx, profile);
    return {
      isPlus,
      tier: isPlus ? ("plus" as const) : ("free" as const),
      appUserId: profile._id,
    };
  },
});

/**
 * Actions can't call hasPremium() directly (it needs QueryCtx | MutationCtx).
 * This lets an internalAction check premium status via ctx.runQuery when it
 * only holds a profile id, not the ctx to load one itself.
 */
export const checkPremiumForProfile = internalQuery({
  args: { emotionalProfileId: v.id("emotional_profiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get("emotional_profiles", args.emotionalProfileId);
    if (!profile) return false;
    return await hasPremium(ctx, profile);
  },
});

// Hook payloads carry appUserId = emotionalProfileId = PostHog distinctId,
// so entitlement funnels stitch with zero aliasing. Hooks retry on failure,
// so these must be idempotent — a duplicate capture is harmless, and the one
// DB write (clearing `pendingKindlingSessionId`) happens in the same
// transaction as the schedule it fulfils, so a retry finds nothing to do.

/**
 * Fired when the component marks an entitlement active (purchase, renewal,
 * trial start, uncancel). Server-side PostHog signal, plus fulfilment of a
 * kindling bought at session-end (`paths.requestKindling`).
 */
export const onEntitlementActivated = internalMutation({
  args: {
    appUserId: v.string(),
    entitlementId: v.string(),
    productId: v.optional(v.string()),
    purchasedAtMs: v.optional(v.number()),
    expiresAtMs: v.optional(v.number()),
    store: v.optional(storeValidator),
    ownershipType: v.optional(ownershipTypeValidator),
    isSandbox: v.boolean(),
    sourceEventType: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.entitlementId !== PLUS_ENTITLEMENT_ID) return;
    await posthog.capture(ctx, {
      distinctId: args.appUserId,
      event: "entitlement_activated",
      properties: {
        entitlementId: args.entitlementId,
        productId: args.productId,
        store: args.store,
        ownershipType: args.ownershipType,
        isSandbox: args.isSandbox,
        sourceEventType: args.sourceEventType,
        expiresAtMs: args.expiresAtMs,
      },
    });

    const profileId = ctx.db.normalizeId("emotional_profiles", args.appUserId);
    const profile = profileId ? await ctx.db.get("emotional_profiles", profileId) : null;
    // Steadiness insights never ran while free (#525): one run now. This hook
    // fires only on inactive → active (an upgrade or a return), never on a renewal.
    if (profile?.firstSessionAt !== undefined) {
      if (!(await hasInsights(ctx, profile._id))) {
        await ctx.scheduler.runAfter(0, internal.ai.reflectionAgent.trigger.runOnUpgrade, {
          emotionalProfileId: profile._id,
        });
      }
    }
    if (!profile?.pendingKindlingSessionId) return;
    await ctx.db.patch("emotional_profiles", profile._id, { pendingKindlingSessionId: undefined });
    await ctx.scheduler.runAfter(0, internal.ai.paths.generate.run, {
      sessionId: profile.pendingKindlingSessionId,
      emotionalProfileId: profile._id,
    });
  },
});

/**
 * Fired when the component marks an entitlement inactive (expiration,
 * refund, cancellation past expiry). Server-side PostHog signal only.
 */
export const onEntitlementDeactivated = internalMutation({
  args: {
    appUserId: v.string(),
    entitlementId: v.string(),
    productId: v.optional(v.string()),
    purchasedAtMs: v.optional(v.number()),
    expiresAtMs: v.optional(v.number()),
    store: v.optional(storeValidator),
    ownershipType: v.optional(ownershipTypeValidator),
    isSandbox: v.boolean(),
    sourceEventType: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.entitlementId !== PLUS_ENTITLEMENT_ID) return;
    await posthog.capture(ctx, {
      distinctId: args.appUserId,
      event: "entitlement_expired",
      properties: {
        entitlementId: args.entitlementId,
        productId: args.productId,
        store: args.store,
        isSandbox: args.isSandbox,
        sourceEventType: args.sourceEventType,
      },
    });
  },
});
