import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { purgeSessions } from "../lib/sessionCascade";

const TIERS = ["6_months", "1_year"] as const;
type Tier = (typeof TIERS)[number];

const RETENTION_MS: Record<Tier, number> = {
  "6_months": 6 * 30 * 24 * 60 * 60 * 1000,
  "1_year": 365 * 24 * 60 * 60 * 1000,
};

const tierValidator = v.union(v.literal("6_months"), v.literal("1_year"));

const BATCH_SIZE = 50;
const PREFS_PAGE_SIZE = 100;

function nextTier(tier: Tier): Tier | null {
  const idx = TIERS.indexOf(tier);
  return idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

/**
 * Purge session data older than the user's retention preference.
 * Processes one retention tier per invocation (Convex allows only one
 * paginated query per mutation) and self-reschedules to continue.
 */
export const enforce = internalMutation({
  args: {
    tier: v.optional(tierValidator),
    cursor: v.optional(v.union(v.string(), v.null())),
    sessionWorkPending: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const tier: Tier = args.tier ?? TIERS[0];
    const cursor = args.cursor ?? null;
    const priorPending = args.sessionWorkPending ?? false;

    const { page: prefs, isDone, continueCursor } = await ctx.db
      .query("preferences")
      .withIndex("by_retention", (q) => q.eq("dataRetentionPreference", tier))
      .paginate({ numItems: PREFS_PAGE_SIZE, cursor });

    const cutoff = Date.now() - RETENTION_MS[tier];
    let moreSessionWork = priorPending;

    for (const pref of prefs) {
      const oldSessions = await ctx.db
        .query("sessions")
        .withIndex("by_profile_time", (q) =>
          q
            .eq("emotionalProfileId", pref.emotionalProfileId)
            .lt("createdAt", cutoff)
        )
        .take(BATCH_SIZE);

      if (oldSessions.length === BATCH_SIZE) {
        moreSessionWork = true;
      }

      await purgeSessions(ctx, pref.emotionalProfileId, oldSessions);
      if (oldSessions.length > 0) {
        await ctx.scheduler.runAfter(0, internal.compounding.unlocks.dropColdUnlocks, {
          profileId: pref.emotionalProfileId,
        });
      }

      // Sweep old semantic profile VERSIONS past the cutoff. The current
      // version is always kept — retention shortens history, it doesn't
      // lobotomize the live profile. Full deletion happens in dataWipe.
      const profileRow = await ctx.db.get("emotional_profiles", pref.emotionalProfileId);
      const oldProfileVersions = await ctx.db
        .query("semantic_profiles")
        .withIndex("by_profile_version", (q) =>
          q.eq("emotionalProfileId", pref.emotionalProfileId)
        )
        .take(BATCH_SIZE);
      for (const version of oldProfileVersions) {
        if (
          version.createdAt < cutoff &&
          version._id !== profileRow?.currentSemanticProfileId
        ) {
          await ctx.db.delete("semantic_profiles", version._id);
        }
      }

      // Closed compounding stretches that ended before the cutoff. The lower
      // bound skips open rows (endedAt absent sorts first): retention never
      // ends a stretch, and an open one keeps its stored anchor (ADR 0020).
      const oldStretches = await ctx.db
        .query("compounding_stretches")
        .withIndex("by_emotionalProfileId_and_endedAt", (q) =>
          q.eq("emotionalProfileId", pref.emotionalProfileId).gte("endedAt", 0).lt("endedAt", cutoff)
        )
        .take(BATCH_SIZE);
      for (const stretch of oldStretches) {
        await ctx.db.delete("compounding_stretches", stretch._id);
      }

      // Steadiness insights citing a session past the cutoff go with it (#525).
      const oldInsights = await ctx.db
        .query("steadiness_insights")
        .withIndex("by_emotionalProfileId_and_oldestCitedAt", (q) =>
          q.eq("emotionalProfileId", pref.emotionalProfileId).lt("oldestCitedAt", cutoff)
        )
        .take(BATCH_SIZE);
      for (const insight of oldInsights) {
        await ctx.db.delete("steadiness_insights", insight._id);
      }

      // Delete feedback records for this profile older than the retention cutoff
      const feedbackRecords = await ctx.db
        .query("feedback")
        .withIndex("by_profile_and_created", (q) =>
          q.eq("emotionalProfileId", pref.emotionalProfileId).lt("createdAt", cutoff)
        )
        .take(BATCH_SIZE);
      for (const record of feedbackRecords) {
        await ctx.db.delete("feedback", record._id);
      }
    }

    if (!isDone) {
      await ctx.scheduler.runAfter(0, internal.jobs.dataRetention.enforce, {
        tier,
        cursor: continueCursor,
        sessionWorkPending: moreSessionWork,
      });
      return;
    }

    if (moreSessionWork) {
      // Restart this tier's pref scan on the next run so stalled deletions resume.
      await ctx.scheduler.runAfter(0, internal.jobs.dataRetention.enforce, {
        tier,
        cursor: null,
      });
      return;
    }

    const next = nextTier(tier);
    if (next) {
      await ctx.scheduler.runAfter(0, internal.jobs.dataRetention.enforce, {
        tier: next,
        cursor: null,
      });
    }
  },
});
