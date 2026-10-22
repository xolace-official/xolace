import { v } from "convex/values";
import { internalAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { isPoolable } from "../lib/poolability";
import schema from "../schema";

// Doc validators derived from the schema so the return type can't drift.
const sessionDoc = v.object({
  _id: v.id("sessions"),
  _creationTime: v.number(),
  ...schema.tables.sessions.validator.fields,
});
const metadataDoc = v.object({
  _id: v.id("emotional_metadata"),
  _creationTime: v.number(),
  ...schema.tables.emotional_metadata.validator.fields,
});

/**
 * Load session + its metadata for anonymization.
 * Queries metadata by sessionId (1:1) to avoid picking up a different session's data.
 */
export const loadSessionForAnonymize = internalQuery({
  args: { sessionId: v.id("sessions") },
  returns: v.union(
    v.null(),
    v.object({ session: sessionDoc, metadata: v.union(metadataDoc, v.null()) }),
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session) return null;

    const metadata = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    return { session, metadata };
  },
});

/**
 * Contribute a session's distilled reflection into the anonymous pool.
 * Called after session completion when user chose to contribute.
 *
 * Uses the pre-generated distilledText (voice-preserving, first-person).
 * Falls back to mirrorText if distillation wasn't generated or returned NULL.
 */
export const anonymize = internalAction({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await ctx.runQuery(
      internal.jobs.reflectionAnonymizer.loadSessionForAnonymize,
      { sessionId: args.sessionId }
    );
    if (!result) return;

    const { session, metadata } = result;
    if (!isPoolable(session)) return; // see lib/poolability.ts
    if (!metadata) return;

    // Prefer distilled text (first-person, voice-preserving)
    // Fall back to mirror text (second-person, AI voice)
    const displayText =
      (session as { distilledText?: string }).distilledText ??
      (session as { mirrorText?: string }).mirrorText;
    if (!displayText) return;

    await ctx.runMutation(internal.reflections.contribute, {
      displayText,
      primaryEmotion: metadata.primaryEmotion,
      granularLabel: metadata.granularLabel,
      thematicTags: metadata.thematicTags,
      intensity: metadata.intensity,
    });
  },
});
