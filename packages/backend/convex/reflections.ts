import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth, requireSessionOwnership } from "./lib/auth";
import { hasPremium } from "./lib/premium";
import { loadSemanticMatches, matchByTags } from "./lib/reflectionMatching";
import { rateLimiter } from "./lib/rateLimits";

// Full `reflections` document shape, mirroring schema.ts's `reflections` table.
const reflectionDocValidator = v.object({
  _id: v.id("reflections"),
  _creationTime: v.number(),
  displayText: v.string(),
  primaryEmotion: v.string(),
  granularLabel: v.optional(v.string()),
  thematicTags: v.array(v.string()),
  intensity: v.number(),
  resonanceCount: v.number(),
  status: v.union(
    v.literal("active"),
    v.literal("flagged"),
    v.literal("removed"),
  ),
  isSeed: v.boolean(),
  addedAt: v.number(),
});

/**
 * Match reflections for a session based on its emotional metadata.
 * Accepts sessionId, verifies ownership, derives emotion from metadata.
 */
export const matchForSession = query({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.array(reflectionDocValidator),
  handler: async (ctx, args) => {
    const { profile, session } = await requireSessionOwnership(
      ctx,
      args.sessionId,
    );

    // Xolace+: precomputed semantic matches lead. Empty when nothing was
    // precomputed or the user isn't premium — the free path is unchanged.
    const semantic =
      session.semanticMatchIds?.length && (await hasPremium(ctx, profile))
        ? await loadSemanticMatches(ctx, session)
        : [];
    if (semantic.length >= 4) return semantic.slice(0, 4);

    // Top up from the tag cascade, deduping against the semantic results.
    const fallback = await matchByTags(ctx, args.sessionId);
    const semanticIds = new Set(semantic.map((r) => r._id));
    return [
      ...semantic,
      ...fallback.filter((r) => !semanticIds.has(r._id)),
    ].slice(0, 4);
  },
});

/**
 * Toggle "I feel this too" — insert or delete resonance record.
 * Returns { resonated: boolean } so the client knows the new state.
 */
export const toggleResonance = mutation({
  args: {
    reflectionId: v.id("reflections"),
  },
  returns: v.object({
    resonated: v.boolean(),
    rateLimited: v.optional(v.boolean()),
  }),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);

    // Rate limit: prevent resonance toggle spam
    const { ok } = await rateLimiter.limit(ctx, "resonanceToggle", {
      key: profile._id,
    });
    if (!ok) {
      return { resonated: false, rateLimited: true };
    }

    const reflection = await ctx.db.get("reflections", args.reflectionId);
    if (!reflection) {
      throw new Error("Reflection not found");
    }

    const existing = await ctx.db
      .query("reflection_resonances")
      .withIndex("by_profile_reflection", (q) =>
        q
          .eq("emotionalProfileId", profile._id)
          .eq("reflectionId", args.reflectionId)
      )
      .unique();

    if (existing) {
      // Un-resonate
      await ctx.db.delete("reflection_resonances", existing._id);
      await ctx.db.patch("reflections", args.reflectionId, {
        resonanceCount: Math.max(0, reflection.resonanceCount - 1),
      });
      return { resonated: false };
    }

    // Resonate
    await ctx.db.insert("reflection_resonances", {
      emotionalProfileId: profile._id,
      reflectionId: args.reflectionId,
      createdAt: Date.now(),
    });
    await ctx.db.patch("reflections", args.reflectionId, {
      resonanceCount: reflection.resonanceCount + 1,
    });
    return { resonated: true };
  },
});

/**
 * Batch check whether the current user has resonated with a set of reflections.
 */
export const hasResonated = query({
  args: {
    reflectionIds: v.array(v.id("reflections")),
  },
  returns: v.record(v.string(), v.boolean()),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);

    const result: Record<string, boolean> = {};
    for (const reflectionId of args.reflectionIds) {
      const existing = await ctx.db
        .query("reflection_resonances")
        .withIndex("by_profile_reflection", (q) =>
          q
            .eq("emotionalProfileId", profile._id)
            .eq("reflectionId", reflectionId)
        )
        .unique();
      result[reflectionId] = !!existing;
    }
    return result;
  },
});

/**
 * Fallback: list recent active reflections when matchForSession returns empty.
 */
export const listRecent = query({
  args: {
    limit: v.number(),
  },
  returns: v.array(reflectionDocValidator),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    return await ctx.db
      .query("reflections")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(Math.min(args.limit, 20));
  },
});

const reportReasonValidator = v.union(
  v.literal("offensive"),
  v.literal("self_harm"),
  v.literal("spam"),
  v.literal("other"),
);

/**
 * Report a peer reflection for offensive or harmful content.
 * Auto-flags the reflection after ≥3 reports from distinct profiles.
 */
export const reportReflection = mutation({
  args: {
    reflectionId: v.id("reflections"),
    reason: reportReasonValidator,
  },
  returns: v.object({
    rateLimited: v.optional(v.boolean()),
    alreadyReported: v.optional(v.boolean()),
    reported: v.optional(v.boolean()),
  }),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);

    const { ok } = await rateLimiter.limit(ctx, "reportReflection", {
      key: profile._id,
    });
    if (!ok) {
      return { rateLimited: true };
    }

    const reflection = await ctx.db.get("reflections", args.reflectionId);
    if (!reflection) {
      throw new Error("Reflection not found");
    }

    const existing = await ctx.db
      .query("reflection_reports")
      .withIndex("by_profile_reflection", (q) =>
        q.eq("reporterProfileId", profile._id).eq("reflectionId", args.reflectionId)
      )
      .unique();

    if (existing) {
      return { alreadyReported: true };
    }

    await ctx.db.insert("reflection_reports", {
      reflectionId: args.reflectionId,
      reporterProfileId: profile._id,
      reason: args.reason,
      createdAt: Date.now(),
    });

    // Auto-flag after ≥3 distinct reports
    const reports = await ctx.db
      .query("reflection_reports")
      .withIndex("by_reflection", (q) => q.eq("reflectionId", args.reflectionId))
      .take(3);

    if (reports.length >= 3 && reflection.status === "active") {
      await ctx.db.patch("reflections", args.reflectionId, { status: "flagged" });
      // Re-run ingest so the now-flagged entry is purged from the RAG pool.
      await ctx.scheduler.runAfter(0, internal.reflectionsRag.ingestReflection, {
        reflectionId: args.reflectionId,
      });
    }

    return { reported: true };
  },
});

/**
 * Insert an anonymized reflection into the pool.
 * No profile reference — anonymity is structural.
 */
export const contribute = internalMutation({
  args: {
    displayText: v.string(),
    primaryEmotion: v.string(),
    granularLabel: v.optional(v.string()),
    thematicTags: v.array(v.string()),
    intensity: v.number(),
  },
  handler: async (ctx, args) => {
    // Round to nearest day then add random jitter within that day to
    // prevent timing correlation attacks across low-traffic periods.
    const now = Date.now();
    const roundedDay = Math.floor(now / 86400000) * 86400000;
    const jitter = Math.floor(Math.random() * 86400000);

    const reflectionId = await ctx.db.insert("reflections", {
      displayText: args.displayText,
      primaryEmotion: args.primaryEmotion,
      granularLabel: args.granularLabel,
      thematicTags: args.thematicTags,
      intensity: args.intensity,
      resonanceCount: 0,
      status: "active",
      isSeed: false,
      addedAt: roundedDay + jitter,
    });

    // Embed into the RAG pool so it's semantically searchable for Plus.
    await ctx.scheduler.runAfter(0, internal.reflectionsRag.ingestReflection, {
      reflectionId,
    });
  },
});

/**
 * Seed curated reflections into the pool.
 */
export const seed = internalMutation({
  args: {
    reflections: v.array(
      v.object({
        displayText: v.string(),
        primaryEmotion: v.string(),
        granularLabel: v.optional(v.string()),
        thematicTags: v.array(v.string()),
        intensity: v.number(),
        addedAt: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const roundedDay = Math.floor(now / 86400000) * 86400000;

    for (const reflection of args.reflections) {
      const { addedAt, ...rest } = reflection;

      // Upsert: skip if this seed reflection already exists (any status).
      const existing = await ctx.db
        .query("reflections")
        .withIndex("by_seed_displayText", (q) =>
          q.eq("isSeed", true).eq("displayText", rest.displayText)
        )
        .first();
      if (existing !== null) continue;

      await ctx.db.insert("reflections", {
        ...rest,
        resonanceCount: 0,
        status: "active",
        isSeed: true,
        addedAt: addedAt ?? roundedDay,
      });
    }
  },
});
