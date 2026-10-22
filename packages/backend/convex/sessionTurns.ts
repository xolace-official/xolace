import { ConvexError, v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireSessionOwnership } from "./lib/auth";
import { userFeedbackValidator } from "./lib/validators";

/** The refinement cap. Exported so the clarify action agrees on the ceiling. */
export const MAX_TURNS = 2;

// Full `session_turns` document shape, mirroring schema.ts exactly.
const sessionTurnDocValidator = v.object({
  _id: v.id("session_turns"),
  _creationTime: v.number(),
  sessionId: v.id("sessions"),
  turnNumber: v.number(),
  userFeedback: userFeedbackValidator,
  userInput: v.optional(v.string()),
  revisedMirrorText: v.string(),
  modelVersion: v.string(),
  createdAt: v.number(),
});

/**
 * Submit refinement feedback ("Not quite" / "Say more").
 * Creates a turn, transitions session back to processing, schedules AI.
 */
export const submitFeedback = mutation({
  args: {
    sessionId: v.id("sessions"),
    userFeedback: userFeedbackValidator,
    userInput: v.optional(v.string()),
    additionalRawText: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);

    if (session.state !== "mirror_delivered") {
      throw new Error(`Cannot submit feedback in state "${session.state}"`);
    }

    // Check turn count
    const existingTurns = await ctx.db
      .query("session_turns")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .take(MAX_TURNS + 1);

    if (existingTurns.length >= MAX_TURNS) {
      // The message keeps the "Maximum refinement turns" substring so app
      // versions matching on error.message still detect this rejection.
      throw new ConvexError({
        code: "max_refinement_turns",
        message: "Maximum refinement turns reached",
      });
    }

    const turnNumber = existingTurns.length + 1;
    const now = Date.now();

    // Create the turn record (revisedMirrorText will be filled by AI)
    await ctx.db.insert("session_turns", {
      sessionId: args.sessionId,
      turnNumber,
      userFeedback: args.userFeedback,
      userInput: args.userInput,
      revisedMirrorText: "", // Placeholder until AI delivers
      modelVersion: "",
      createdAt: now,
    });

    // Transition session back to processing
    await ctx.db.patch("sessions", args.sessionId, {
      state: "processing",
      processingStage: undefined,
      updatedAt: now,
    });

    // Schedule AI clarification
    await ctx.scheduler.runAfter(0, internal.ai.clarify.handleClarification, {
      sessionId: args.sessionId,
      turnNumber,
      additionalRawText: args.additionalRawText,
    });

    return null;
  },
});

/**
 * AI delivers the revised mirror text for a turn.
 */
export const deliverRevisedMirror = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    turnNumber: v.number(),
    revisedMirrorText: v.string(),
    modelVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Find the turn and update it
    const turn = await ctx.db
      .query("session_turns")
      .withIndex("by_session", (q) =>
        q.eq("sessionId", args.sessionId).eq("turnNumber", args.turnNumber)
      )
      .unique();

    if (!turn) {
      throw new Error("Turn not found");
    }

    await ctx.db.patch("session_turns", turn._id, {
      revisedMirrorText: args.revisedMirrorText,
      modelVersion: args.modelVersion,
    });
  },
});

/**
 * List all turns for a session (with ownership check).
 */
export const listBySession = query({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.array(sessionTurnDocValidator),
  handler: async (ctx, args) => {
    await requireSessionOwnership(ctx, args.sessionId);

    return await ctx.db
      .query("session_turns")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .take(5);
  },
});
