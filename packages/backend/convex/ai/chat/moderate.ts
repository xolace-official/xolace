import { type ObjectType, v } from "convex/values";
import { internal } from "../../_generated/api";
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server";
import { flagStreamMessage, sendStreamSystemMessage } from "../../integrations/stream";
import {
  chatModerationCategoryValidator,
  conversationRoleValidator,
  safeguardLevelValidator,
} from "../../lib/validators";
import {
  CHAT_MODERATION_MODEL,
  extractTextFromResponse,
  getAnthropicClient,
  thinkingOff,
} from "../providers/anthropic";
import { CRISIS_RESOURCES, SUPPORT_RESOURCES, type Resource, type SafeguardLevel } from "../safeguard";
import {
  buildChatModerationPrompt,
  CHAT_MODERATION_VERSION,
  parseChatModerationResponse,
} from "./classify";

/** The custom `kind` the client's `MessageSystem` override renders as a card. */
export const CRISIS_RESOURCES_KIND = "crisis_resources";

/** Which resource set a level earns in a DM. `elevated` gets the support set —
 * the same threshold at which the reflect flow shows resources. */
export function crisisResourcesFor(level: SafeguardLevel): Resource[] | null {
  if (level === "crisis") return CRISIS_RESOURCES;
  if (level === "elevated") return SUPPORT_RESOURCES;
  return null;
}

/**
 * The post-delivery lane (#344). Scheduled by the Stream webhook after the
 * push has been scheduled, so a failure here can never delay a notification.
 * One model call per qualifying message; the verdict row is the only thing
 * written, and the message text is never stored.
 */
export const moderateChatMessage = internalAction({
  args: {
    conversationId: v.id("xolacer_conversations"),
    senderRole: conversationRoleValidator,
    streamChannelId: v.string(),
    streamMessageId: v.string(),
    text: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // A redelivered webhook that slipped past the `x-webhook-id` guard (header
    // dropped) still costs nothing here.
    const seen: boolean = await ctx.runQuery(internal.ai.chat.moderate.hasVerdict, {
      streamMessageId: args.streamMessageId,
    });
    if (seen) return null;

    const prompt = buildChatModerationPrompt(args.text, args.senderRole);
    const response = await getAnthropicClient().messages.create({
      model: CHAT_MODERATION_MODEL,
      max_tokens: 200,
      thinking: thinkingOff(CHAT_MODERATION_MODEL),
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }],
    });
    const verdict = parseChatModerationResponse(extractTextFromResponse(response));

    const categories = (["harassment", "spam", "contact"] as const).filter((c) => verdict[c]);

    await deliverVerdict(ctx, {
      conversationId: args.conversationId,
      streamMessageId: args.streamMessageId,
      streamChannelId: args.streamChannelId,
      senderRole: args.senderRole,
      level: verdict.crisis,
      categories,
      confidence: verdict.confidence,
      attempt: 0,
    });
    return null;
  },
});

const deliveryArgs = {
  conversationId: v.id("xolacer_conversations"),
  streamMessageId: v.string(),
  streamChannelId: v.string(),
  senderRole: conversationRoleValidator,
  level: safeguardLevelValidator,
  categories: v.array(chatModerationCategoryValidator),
  confidence: v.number(),
  attempt: v.number(),
};
type DeliveryArgs = ObjectType<typeof deliveryArgs>;

/** Attempts 0..MAX-1; backoff doubles from this base between them. */
const MAX_DELIVERY_ATTEMPTS = 5;
const DELIVERY_BACKOFF_MS = 30_000;

/**
 * Effects before the row: the verdict is recorded only once the card and the
 * flag have landed, so a Stream outage never leaves a row that says "done"
 * over a card that never arrived. A failed attempt reschedules itself through
 * the scheduler (durable) a bounded number of times; the card carries a
 * message id derived from the moderated message, so a retry that lands twice
 * is a Stream duplicate — accepted as delivered — not a second card.
 */
async function deliverVerdict(ctx: ActionCtx, args: DeliveryArgs): Promise<void> {
  try {
    const resources = crisisResourcesFor(args.level);
    if (resources) {
      await sendStreamSystemMessage(args.streamChannelId, {
        id: `${CRISIS_RESOURCES_KIND}_${args.streamMessageId}`,
        // Fallback for a client without the card override.
        text: "Support is available — see the resources below.",
        kind: CRISIS_RESOURCES_KIND,
        level: args.level,
        resources,
      });
    }
    if (args.categories.length > 0) {
      await flagStreamMessage(args.streamMessageId, args.categories.join(","));
    }
  } catch (error) {
    const next = args.attempt + 1;
    if (next >= MAX_DELIVERY_ATTEMPTS) throw error;
    console.warn(`chat moderation delivery attempt ${next} failed, retrying`, error);
    await ctx.scheduler.runAfter(
      DELIVERY_BACKOFF_MS * 2 ** args.attempt,
      internal.ai.chat.moderate.retryDelivery,
      { ...args, attempt: next },
    );
    return;
  }

  const { attempt: _attempt, streamChannelId: _channel, ...verdict } = args;
  await ctx.runMutation(internal.ai.chat.moderate.recordVerdict, verdict);
}

export const retryDelivery = internalAction({
  args: deliveryArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    await deliverVerdict(ctx, args);
    return null;
  },
});

export const hasVerdict = internalQuery({
  args: { streamMessageId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { streamMessageId }) => {
    const row = await ctx.db
      .query("chat_moderation_events")
      .withIndex("by_messageId", (q) => q.eq("streamMessageId", streamMessageId))
      .unique();
    return row !== null;
  },
});

/** Inserts once per message — a row already there is left alone. */
export const recordVerdict = internalMutation({
  args: {
    conversationId: v.id("xolacer_conversations"),
    streamMessageId: v.string(),
    senderRole: conversationRoleValidator,
    level: safeguardLevelValidator,
    categories: v.array(chatModerationCategoryValidator),
    confidence: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chat_moderation_events")
      .withIndex("by_messageId", (q) => q.eq("streamMessageId", args.streamMessageId))
      .unique();
    if (existing) return null;
    await ctx.db.insert("chat_moderation_events", {
      ...args,
      modelVersion: CHAT_MODERATION_VERSION,
      createdAt: Date.now(),
    });
    return null;
  },
});
