// V8 runtime — Anthropic SDK uses fetch, no Node built-ins needed.

import { v } from "convex/values";
import { ActionCtx, internalAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { renderSemanticProfile } from "../semanticProfiles";
import {
  buildQuotePrompt,
  selectReplyContext,
  REPLY_CONTEXT_WINDOW_DAYS,
  type QuoteReply,
} from "./quotesPrompt";
import { dailyAngleSeed } from "./quotesQuality";
import { requestQuoteText } from "./quotesRequest";

/**
 * Load recent emotional metadata for session-derived quote generation.
 * Uses up to 3 most recent sessions within the last 7 days.
 * NEVER accesses rawInput — only emotional metadata. That invariant holds for
 * this query, but no longer for the quote path as a whole: `loadRecentReplies`
 * below carries the user's own reply text into the prompt, bounded and guarded
 * (#314, docs/adr/0006-replies-cross-the-quote-metadata-boundary.md).
 */
export const loadEmotionalContext = internalQuery({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    referenceDate: v.number(),
  },
  handler: async (ctx, args) => {
    const fiveDaysAgo = args.referenceDate - 5 * 24 * 60 * 60 * 1000;

    // by_profile_state lands the two newest completed sessions in exactly two
    // doc reads; the 5-day cutoff is then a cheap in-memory check on those.
    const recentSessions = (
      await ctx.db
        .query("sessions")
        .withIndex("by_profile_state", (q) =>
          q
            .eq("emotionalProfileId", args.emotionalProfileId)
            .eq("state", "completed")
        )
        .order("desc")
        .take(2)
    ).filter((s) => s.createdAt >= fiveDaysAgo);

    if (recentSessions.length === 0) return null;

    // Load emotional metadata for each session (privacy-safe: no rawInput)
    const contextItems = [];
    for (const session of recentSessions) {
      const metadata = await ctx.db
        .query("emotional_metadata")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .unique();

      if (metadata) {
        contextItems.push({
          sessionId: session._id,
          sessionCreatedAt: session.createdAt,
          primaryEmotion: metadata.primaryEmotion,
          granularLabel: metadata.granularLabel,
          thematicTags: metadata.thematicTags,
          intensity: metadata.intensity,
        });
      }
    }

    return contextItems.length > 0
      ? { sessions: contextItems, sessionIds: contextItems.map((c) => c.sessionId) }
      : null;
  },
});

/**
 * Load the text of recent session-derived quotes for this user (excluding today).
 * Used to steer the model away from angles it has already taken.
 */
export const loadRecentQuotes = internalQuery({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    beforeDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Fetch last 14 rows (≤7 days × 2 types) bounded by profile + date range
    const rows = await ctx.db
      .query("daily_quotes")
      .withIndex("by_profile_date", (q) =>
        q.eq("emotionalProfileId", args.emotionalProfileId).lt("date", args.beforeDate)
      )
      .order("desc")
      .take(14);

    const recent = rows.filter((r) => r.type === "session").slice(0, 7);

    return {
      texts: recent.map((r) => r.text),
      titles: recent.map((r) => r.title).filter((t): t is string => !!t),
    };
  },
});

/**
 * Load what the user wrote back to their recent quotes (#314). This is the one
 * place raw user text reaches the quote path — bounded by `selectReplyContext`
 * (3 within 7 days, ~280 chars each, flagged replies excluded) and guarded by
 * the prompt's "take its register, not its content" NEVER line. See
 * docs/adr/0006-replies-cross-the-quote-metadata-boundary.md.
 */
export const loadRecentReplies = internalQuery({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    referenceDate: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoffMs = args.referenceDate - REPLY_CONTEXT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(cutoffMs).toISOString().slice(0, 10);

    // ≤2 rows/day over the window, so 20 covers it with headroom; the reply
    // fields are on the row, so this is the same read either way.
    const rows = await ctx.db
      .query("daily_quotes")
      .withIndex("by_profile_date", (q) =>
        q.eq("emotionalProfileId", args.emotionalProfileId).gte("date", cutoffDate)
      )
      .order("desc")
      .take(20);

    const candidates: QuoteReply[] = rows
      .filter((r) => r.reply !== undefined && r.repliedAt !== undefined)
      .map((r) => ({
        text: r.reply as string,
        repliedAt: r.repliedAt as number,
        // An unavailable check is not a clean one — treat it like a flag so
        // unmoderated text never reaches the prompt.
        flagged: (r.replyModeration?.flagged ?? false) || (r.replyModeration?.unavailable ?? false),
      }));

    return selectReplyContext(candidates, args.referenceDate);
  },
});

/**
 * Generate a session-derived quote for one user.
 * Called per-user by the nightly cron batch processor.
 */
type EmotionalContext = {
  sessions: {
    sessionId: Id<"sessions">;
    sessionCreatedAt: number;
    primaryEmotion: string;
    granularLabel?: string;
    thematicTags: string[];
    intensity: number;
  }[];
  sessionIds: Id<"sessions">[];
} | null;

/**
 * Plain helper — call directly from actions in the same V8 runtime
 * to avoid ctx.runAction overhead and an extra Convex function round-trip.
 */
export async function distillQuoteForUser(
  ctx: ActionCtx,
  args: { emotionalProfileId: Id<"emotional_profiles">; date: string; preferredThemes: string[] }
): Promise<string | null> {
  try {
      const refMs = new Date(args.date + "T00:00:00Z").getTime();

      const [context, recentQuotes, semanticProfileDoc, replies] = await Promise.all([
        ctx.runQuery(internal.ai.quotesDistiller.loadEmotionalContext, {
          emotionalProfileId: args.emotionalProfileId,
          referenceDate: refMs,
        }) as Promise<EmotionalContext>,
        ctx.runQuery(internal.ai.quotesDistiller.loadRecentQuotes, {
          emotionalProfileId: args.emotionalProfileId,
          beforeDate: args.date,
        }) as Promise<{ texts: string[]; titles: string[] }>,
        ctx.runQuery(internal.semanticProfiles.getCurrent, {
          emotionalProfileId: args.emotionalProfileId,
        }) as Promise<Doc<"semantic_profiles"> | null>,
        ctx.runQuery(internal.ai.quotesDistiller.loadRecentReplies, {
          emotionalProfileId: args.emotionalProfileId,
          referenceDate: refMs,
        }) as Promise<{ text: string; repliedAt: number }[]>,
      ]);

      if (!context) {
        console.log(
          `[quotesDistiller] No recent sessions for ${args.emotionalProfileId}, skipping session-derived quote`
        );
        return null;
      }

      const angleSeed = dailyAngleSeed(args.date);
      const renderedProfile = semanticProfileDoc
        ? renderSemanticProfile(semanticProfileDoc)
        : null;

      const { systemPrompt, userPrompt } = buildQuotePrompt({
        angleSeed,
        now: refMs,
        sessions: context.sessions,
        renderedProfile,
        preferredThemes: args.preferredThemes,
        recentQuoteTexts: recentQuotes.texts,
        recentQuoteTitles: recentQuotes.titles,
        replies,
      });

      const quote = await requestQuoteText({
        systemPrompt,
        userPrompt,
        label: args.emotionalProfileId,
      });

      if (!quote) return null;

      const quoteId = await ctx.runMutation(internal.dailyQuotes.store, {
        emotionalProfileId: args.emotionalProfileId,
        date: args.date,
        type: "session",
        text: quote.text,
        title: quote.title,
        sessionContextIds: context.sessionIds,
      });

      console.log(
        `[quotesDistiller] Stored session-derived quote ${quoteId} for ${args.emotionalProfileId} (${args.date})`
      );
      return quote.text;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[quotesDistiller] Failed for ${args.emotionalProfileId}: ${message}`
      );
      return null;
    }
}

export const generateForUser = internalAction({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    date: v.string(),
    preferredThemes: v.array(v.string()),
  },
  handler: (ctx, args) => distillQuoteForUser(ctx, args),
});
