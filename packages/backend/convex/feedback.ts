import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireSessionOwnership } from "./lib/auth";
import { rateLimiter } from "./lib/rateLimits";

const THROTTLE_MS = 24 * 60 * 60 * 1000;

export const canAskContextual = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    const last = await ctx.db
      .query("feedback")
      .withIndex("by_profile_and_type_and_created", (q) =>
        q.eq("emotionalProfileId", profile._id).eq("type", "mood_heavier")
      )
      .order("desc")
      .first();
    if (!last) return true;
    return last.createdAt < Date.now() - THROTTLE_MS;
  },
});

export const canAskUnsureContextual = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    const last = await ctx.db
      .query("feedback")
      .withIndex("by_profile_and_type_and_created", (q) =>
        q.eq("emotionalProfileId", profile._id).eq("type", "mood_unsure")
      )
      .order("desc")
      .first();
    if (!last) return true;
    return last.createdAt < Date.now() - THROTTLE_MS;
  },
});

export const canSubmitGeneral = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    const { ok } = await rateLimiter.check(ctx, "generalFeedback", {
      key: profile._id,
    });
    return ok;
  },
});

export const submit = mutation({
  args: {
    type: v.union(
      v.literal("general"),
      v.literal("mood_heavier"),
      v.literal("mood_unsure"),
      v.literal("mirror_miss"),
      v.literal("gave_up"),
    ),
    sessionId: v.optional(v.id("sessions")),
    turnIndex: v.optional(v.number()),
    text: v.optional(v.string()),
    selectedOption: v.optional(v.string()),
  },
  returns: v.union(v.literal("ok"), v.null()),
  handler: async (ctx, args) => {
    const { profile } = args.sessionId
      ? await requireSessionOwnership(ctx, args.sessionId)
      : await requireAuth(ctx);

    // Per-type required field validation
    if (args.type === "general") {
      if (!args.text?.trim()) throw new Error("Text is required for general feedback");
      if (args.text.length > 1000) throw new Error("Text exceeds 1000 character limit");
    }
    if (args.type === "mirror_miss") {
      if (!args.sessionId) throw new Error("sessionId is required for mirror_miss feedback");
      if (args.turnIndex === undefined) throw new Error("turnIndex is required for mirror_miss feedback");
      if (!args.selectedOption) throw new Error("selectedOption is required for mirror_miss feedback");
      if (args.text && args.text.length > 100) throw new Error("Text exceeds 100 character limit");
    }
    if (args.type === "mood_unsure") {
      if (!args.selectedOption) throw new Error("selectedOption is required for mood_unsure feedback");
      if (args.text && args.text.length > 300) throw new Error("Text exceeds 300 character limit");
    }
    if (args.type === "gave_up") {
      if (!args.sessionId) throw new Error("sessionId is required for gave_up feedback");
      if (!args.selectedOption) throw new Error("selectedOption is required for gave_up feedback");
    }
    if (args.type === "mood_heavier" && args.text && args.text.length > 300) {
      throw new Error("Text exceeds 300 character limit");
    }

    // Server-side throttle for mood_unsure — silent no-op on race condition
    if (args.type === "mood_unsure") {
      const last = await ctx.db
        .query("feedback")
        .withIndex("by_profile_and_type_and_created", (q) =>
          q.eq("emotionalProfileId", profile._id).eq("type", "mood_unsure")
        )
        .order("desc")
        .first();
      if (last && last.createdAt >= Date.now() - THROTTLE_MS) {
        return null;
      }
    }

    // Server-side throttle for mood_heavier — silent no-op on race condition
    if (args.type === "mood_heavier") {
      const last = await ctx.db
        .query("feedback")
        .withIndex("by_profile_and_type_and_created", (q) =>
          q.eq("emotionalProfileId", profile._id).eq("type", "mood_heavier")
        )
        .order("desc")
        .first();
      if (last && last.createdAt >= Date.now() - THROTTLE_MS) {
        return null;
      }
    }

    // Server-side rate limit guard for general
    if (args.type === "general") {
      const { ok } = await rateLimiter.limit(ctx, "generalFeedback", {
        key: profile._id,
      });
      if (!ok) throw new Error("Feedback rate limit reached");
    }

    await ctx.db.insert("feedback", {
      emotionalProfileId: profile._id,
      type: args.type,
      sessionId: args.sessionId,
      turnIndex: args.turnIndex,
      text: args.text,
      selectedOption: args.selectedOption,
      createdAt: Date.now(),
    });

    return "ok";
  },
});
