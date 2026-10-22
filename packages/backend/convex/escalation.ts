import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { requireSessionOwnership } from "./lib/auth";
import { triggerTypeValidator, actionTakenValidator, resourceValidator } from "./lib/validators";

/**
 * AI creates an escalation event when safety signals are detected.
 * Enforces triggerEvidence policy: ONLY model confidence categories
 * and trigger type descriptions. NEVER paraphrased user language.
 */
export const create = internalMutation({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    sessionId: v.id("sessions"),
    triggerType: triggerTypeValidator,
    triggerConfidence: v.number(),
    triggerEvidence: v.string(),
    actionTaken: actionTakenValidator,
    resourcesPresented: v.array(v.union(v.string(), resourceValidator)),
  },
  handler: async (ctx, args) => {
    // One event per session: a remade mirror (a talk's "Say more" reopening,
    // a clarify turn) re-runs the pipeline on a session that already escalated.
    const existing = await ctx.db
      .query("escalation_events")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (existing) return existing._id;

    const eventId = await ctx.db.insert("escalation_events", {
      emotionalProfileId: args.emotionalProfileId,
      sessionId: args.sessionId,
      triggerType: args.triggerType,
      triggerConfidence: args.triggerConfidence,
      triggerEvidence: args.triggerEvidence,
      actionTaken: args.actionTaken,
      resourcesPresented: args.resourcesPresented,
      reviewedByHuman: false,
      createdAt: Date.now(),
    });

    // Mark the session as having triggered escalation
    await ctx.db.patch("sessions", args.sessionId, {
      escalationTriggered: true,
      updatedAt: Date.now(),
    });

    return eventId;
  },
});

/**
 * Record how the user responded to an escalation.
 */
export const recordUserResponse = mutation({
  args: {
    sessionId: v.id("sessions"),
    userResponse: v.union(
      v.literal("engaged"),
      v.literal("dismissed"),
      v.literal("no_response")
    ),
  },
  handler: async (ctx, args) => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);

    // Find the escalation event for this session
    const event = await ctx.db
      .query("escalation_events")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();

    if (!event) {
      throw new Error("No escalation event found for this session");
    }

    await ctx.db.patch("escalation_events", event._id, {
      userResponse: args.userResponse,
    });

    return null;
  },
});
