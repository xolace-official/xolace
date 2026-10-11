/**
 * The compounding upsell (#524, #496 §4; CONTEXT.md "Free view, compounding
 * upsell"): a free user learns a named domain has been heavier than their
 * usual, with no number, on Insights and at session end. In the app only:
 * nothing here pushes, since the lock screen isn't private. At most once per
 * stretch, spent by markShown when the client shows it; never while a hard
 * moment is recent (#530). Crisis resources and safety
 * follow-ups never pass through here, so they stay free in every state.
 */
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type QueryCtx } from "../_generated/server";
import { requireAuth, requireSessionOwnership } from "../lib/auth";
import { hasPremium } from "../lib/premium";
import { domainValidator } from "../lib/validators";
import { compoundingFor, spendStretch } from "./stretches";

const upsellValidator = v.object({ domain: domainValidator, stretchStartedAt: v.number() });

const WEEK_MS = 7 * 86_400_000;
/** More sessions than this in the window reads as flagged: never pitch when unsure. */
const WINDOW_CAP = 200;

/**
 * Safeguard flagged (elevated or crisis, on the session or its
 * Understanding, or an escalation), or the person burned, any session since
 * the stretch started or in the past week, whichever reaches further back.
 * The gate lives here, not in compounding/stretches, which never reads
 * safeguard state.
 */
async function hardMomentSince(ctx: QueryCtx, profileId: Id<"emotional_profiles">, stretchStartedAt: number) {
  const since = Math.min(stretchStartedAt, Date.now() - WEEK_MS);
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_profile_time", (q) => q.eq("emotionalProfileId", profileId).gte("createdAt", since))
    .take(WINDOW_CAP + 1);
  if (sessions.length > WINDOW_CAP) return true;
  for (const session of sessions) {
    if (session.kept === false || session.escalationTriggered === true) return true;
    const meta: Doc<"emotional_metadata"> | null = await ctx.runQuery(
      internal.understanding.getUnderstanding,
      { sessionId: session._id },
    );
    if ([session.safeguardLevel, meta?.safeguardLevel].some((l) => l === "elevated" || l === "crisis")) {
      return true;
    }
  }
  return false;
}

/** The stretch to name, or null. Session end passes its session; Insights passes none. */
export const get = query({
  args: { sessionId: v.optional(v.id("sessions")) },
  returns: v.union(upsellValidator, v.null()),
  handler: async (ctx, { sessionId }) => {
    const { profile } = sessionId ? await requireSessionOwnership(ctx, sessionId) : await requireAuth(ctx);
    // An entitlement outage reads as Xolace+: never upsell someone who may have paid.
    if (await hasPremium(ctx, profile).catch(() => true)) return null;
    const top = (await compoundingFor(ctx, profile._id)).find(
      (c) => c.state === "compounding" && !c.upsellShown,
    );
    if (!top || (await hardMomentSince(ctx, profile._id, top.startedAt))) return null;
    return { domain: top.domain, stretchStartedAt: top.startedAt };
  },
});

/** It showed: spent for the stretch, wherever it showed (a dismissal holds too). */
export const markShown = mutation({
  args: upsellValidator.fields,
  returns: v.null(),
  handler: async (ctx, ref) => {
    const { profile } = await requireAuth(ctx);
    await spendStretch(ctx, profile._id, ref, "upsellShownAt");
    return null;
  },
});
