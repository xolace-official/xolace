import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { distillQuoteForUser } from "../ai/quotesDistiller";

const BATCH_SIZE = 20;

function utcDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export const getNextBatch = internalQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("emotional_profiles")
      .paginate({ numItems: BATCH_SIZE, cursor: args.cursor });

    return {
      page: result.page.map((p) => p._id),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/**
 * Single-transaction check: combines hasQuotesForToday + isProfileActive.
 * Avoids two sequential ctx.runQuery calls from the action.
 */
export const getProfileStatus = internalQuery({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    // Idempotency check — only consider fully done when a curated quote exists
    // (curated is always the last step in processUser, so its presence means both types ran)
    const existing = await ctx.db
      .query("daily_quotes")
      .withIndex("by_profile_date_type", (q) =>
        q
          .eq("emotionalProfileId", args.emotionalProfileId)
          .eq("date", args.date)
          .eq("type", "curated")
      )
      .unique();

    if (existing) return { alreadyDone: true, active: false, prefs: null };

    // Prefs check
    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) =>
        q.eq("emotionalProfileId", args.emotionalProfileId)
      )
      .unique();

    if (prefs?.quotes !== undefined) return { alreadyDone: false, active: true, prefs };

    // Fall back to recent-session check
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentSession = await ctx.db
      .query("sessions")
      .withIndex("by_profile_time", (q) =>
        q.eq("emotionalProfileId", args.emotionalProfileId).gte("createdAt", thirtyDaysAgo)
      )
      .first();

    return { alreadyDone: false, active: !!recentSession, prefs };
  },
});

/**
 * Single-transaction mutation: store curated quote + mark it shown.
 * Avoids two sequential ctx.runMutation calls from the action.
 */
export const storeCuratedAndMarkShown = internalMutation({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    date: v.string(),
    text: v.string(),
    title: v.optional(v.string()),
    quoteId: v.id("quotes"),
  },
  handler: async (ctx, args) => {
    // Idempotency — skip if curated already stored
    const existing = await ctx.db
      .query("daily_quotes")
      .withIndex("by_profile_date_type", (q) =>
        q
          .eq("emotionalProfileId", args.emotionalProfileId)
          .eq("date", args.date)
          .eq("type", "curated")
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("daily_quotes", {
        emotionalProfileId: args.emotionalProfileId,
        date: args.date,
        type: "curated",
        text: args.text,
        title: args.title,
        isPremium: false,
        reaction: undefined,
        createdAt: Date.now(),
      });
    }

    // Mark shown in prefs (cap at 500)
    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) =>
        q.eq("emotionalProfileId", args.emotionalProfileId)
      )
      .unique();

    if (prefs?.quotes) {
      const updated = [...(prefs.quotes.shownQuoteIds ?? []), args.quoteId].slice(-500);
      await ctx.db.patch("preferences", prefs._id, { quotes: { ...prefs.quotes, shownQuoteIds: updated } });
    }
  },
});

/**
 * Process one user: generate session-derived + curated quotes.
 */
export const processUser = internalAction({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
  },
  handler: async (ctx, args) => {
    const date = utcDateString();

    // Single query: idempotency + active check + prefs — avoids two round-trips
    const { alreadyDone, active, prefs }: {
      alreadyDone: boolean;
      active: boolean;
      prefs: { quotes?: { themes: string[]; notificationEnabled: boolean; notificationTime?: string; shownQuoteIds: string[] } } | null;
    } = await ctx.runQuery(internal.jobs.quotesGenerator.getProfileStatus, {
      emotionalProfileId: args.emotionalProfileId,
      date,
    });

    if (alreadyDone) {
      console.log(`[quotesGenerator:processUser] Already done for ${args.emotionalProfileId} on ${date}`);
      return;
    }
    if (!active) return;

    const themes = prefs?.quotes?.themes ?? [];
    const shownQuoteIds = (prefs?.quotes?.shownQuoteIds ?? []) as any[];

    // 1. Session-derived (personalized) quote — Xolace+ only. Skipping the LLM
    // call for free users avoids paying for a quote they'll never see.
    const isPremium: boolean = await ctx.runQuery(
      internal.premium.checkPremiumForProfile,
      { emotionalProfileId: args.emotionalProfileId }
    );
    if (isPremium) {
      await distillQuoteForUser(ctx, {
        emotionalProfileId: args.emotionalProfileId,
        date,
        preferredThemes: themes,
      });
    }

    // 2. Curated quote
    const curatedQuote: { _id: string; text: string; title?: string } | null = await ctx.runQuery(
      internal.quotes.pickCuratedQuote,
      { emotionalProfileId: args.emotionalProfileId, themes, shownQuoteIds }
    );

    if (curatedQuote) {
      // Single mutation: store + mark shown atomically
      await ctx.runMutation(internal.jobs.quotesGenerator.storeCuratedAndMarkShown, {
        emotionalProfileId: args.emotionalProfileId,
        date,
        text: curatedQuote.text,
        title: curatedQuote.title,
        quoteId: curatedQuote._id as any,
      });
    }

    console.log(`[quotesGenerator:processUser] Done for ${args.emotionalProfileId} on ${date}`);
  },
});

export const generateForNextBatch = internalAction({
  args: {
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const isProd = process.env.CONVEX_ENV === "production";
    if (!isProd) {
      console.log("[quotesGenerator] Not production, skipping nightly run");
      return;
    }

    const { page, isDone, continueCursor }: {
      page: string[];
      isDone: boolean;
      continueCursor: string;
    } = await ctx.runQuery(internal.jobs.quotesGenerator.getNextBatch, {
      cursor: args.cursor,
    });

    for (const profileId of page) {
      await ctx.scheduler.runAfter(
        0,
        internal.jobs.quotesGenerator.processUser,
        { emotionalProfileId: profileId as any }
      );
    }

    console.log(`[quotesGenerator] Dispatched ${page.length} users, isDone=${isDone}`);

    if (!isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.jobs.quotesGenerator.generateForNextBatch,
        { cursor: continueCursor }
      );
    }
  },
});
