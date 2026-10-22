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
		context: contextValidator,
		conversationId: v.id("xolacer_conversations"),
		messageId: v.string(),
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const conversation = await ctx.db.get(
			"xolacer_conversations",
			args.conversationId
		);
		if (!conversation) {
			throw new Error("Conversation not found");
		}
		const subjectProfileId =
			conversation.userProfileId === profile._id
				? conversation.xolacerProfileId
				: conversation.xolacerProfileId === profile._id
					? conversation.userProfileId
					: null;
		if (!subjectProfileId) {
			throw new Error("Conversation does not belong to this user");
		}

		await ctx.db.insert("product_feedback", {
			context: args.context,
			conversationId: args.conversationId,
			createdAt: Date.now(),
			emotionalProfileId: profile._id,
			kind: "flag",
			messageId: args.messageId,
			subjectProfileId,
			text: "",
		});
		return null;
	},
	returns: v.null(),
});

/** Stream user ids are profile ids (see `upsertStreamUsers`). Best-effort. */
export const flagSubjectOnStream = internalAction({
	args: {
		reporterProfileId: v.id("emotional_profiles"),
		subjectProfileId: v.id("emotional_profiles"),
	},
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
	returns: v.null(),
});
