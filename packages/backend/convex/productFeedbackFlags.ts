import { v } from "convex/values";
import { internalAction, mutation } from "./_generated/server";
import { flagStreamUser } from "./integrations/stream";
import { requireAuth } from "./lib/auth";
import { contextValidator } from "./productFeedback";

/**
 * Flag one message from a conversation the caller is in. Lighter than a
 * concern: no text, no budget — pointing at evidence is never rationed. The
 * subject is always the counterpart, derived here rather than accepted from
 * the client. The client flags the same message in Stream with its own token,
 * so the dashboard queue names the flagger.
 */
export const flagMessage = mutation({
  args: {
    conversationId: v.id("xolacer_conversations"),
    messageId: v.string(),
    context: contextValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    const conversation = await ctx.db.get("xolacer_conversations", args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    const subjectProfileId =
      conversation.userProfileId === profile._id
        ? conversation.xolacerProfileId
        : conversation.xolacerProfileId === profile._id
          ? conversation.userProfileId
          : null;
    if (!subjectProfileId) throw new Error("Conversation does not belong to this user");

    await ctx.db.insert("product_feedback", {
      emotionalProfileId: profile._id,
      kind: "flag",
      text: "",
      context: args.context,
      subjectProfileId,
      conversationId: args.conversationId,
      messageId: args.messageId,
      createdAt: Date.now(),
    });
    return null;
  },
});

/** Stream user ids are profile ids (see `upsertStreamUsers`). Best-effort. */
export const flagSubjectOnStream = internalAction({
  args: {
    subjectProfileId: v.id("emotional_profiles"),
    reporterProfileId: v.id("emotional_profiles"),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    try {
      await flagStreamUser(args.subjectProfileId, args.reporterProfileId);
    } catch (error) {
      // A reporter who never opened chat has no Stream user to flag from; the
      // tray row is the record either way.
      console.warn("[concern] Stream flagUser failed", error);
    }
    return null;
  },
});
