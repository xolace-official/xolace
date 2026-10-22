import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const MODERATION_BATCH_SIZE = 100;

/**
 * Purge one bounded batch of a conversation's moderation verdicts. Returns
 * true when the batch was full — the caller must leave the conversation row
 * in place and come back, so a verdict never outlives its conversation.
 */
export async function purgeModerationEvents(
  ctx: MutationCtx,
  conversationId: Id<"xolacer_conversations">,
): Promise<boolean> {
  const events = await ctx.db
    .query("chat_moderation_events")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .take(MODERATION_BATCH_SIZE);
  for (const event of events) await ctx.db.delete("chat_moderation_events", event._id);
  return events.length === MODERATION_BATCH_SIZE;
}

/** Delete a conversation and its verdicts; false if the verdicts need another pass. */
export async function deleteConversationRow(
  ctx: MutationCtx,
  conversationId: Id<"xolacer_conversations">,
): Promise<boolean> {
  if (await purgeModerationEvents(ctx, conversationId)) return false;
  await ctx.db.delete("xolacer_conversations", conversationId);
  return true;
}
