import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { hasPremium, requirePremium } from "./lib/premium";
import { MODERATION_UNAVAILABLE, moderateInput } from "./ai/providers/moderation";
import { internal } from "./_generated/api";
import { rateLimiter } from "./lib/rateLimits";
import { recordActivity } from "./streaks/activityLog";

function utcDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/** Shape of a `daily_quotes` row, as returned to the client. */
const quoteValidator = v.object({
  _id: v.id("daily_quotes"),
  _creationTime: v.number(),
  emotionalProfileId: v.id("emotional_profiles"),
  date: v.string(),
  type: v.union(v.literal("session"), v.literal("curated")),
  text: v.string(),
  title: v.optional(v.string()),
  sessionContextIds: v.optional(v.array(v.id("sessions"))),
  isPremium: v.boolean(),
  reaction: v.optional(v.union(v.literal("resonates"), v.literal("not_today"))),
  savedAt: v.optional(v.number()),
  reply: v.optional(v.string()),
  repliedAt: v.optional(v.number()),
  replyModeration: v.optional(
    v.object({
      flagged: v.boolean(),
      categories: v.array(v.string()),
      checkedAt: v.number(),
      unavailable: v.optional(v.boolean()),
    })
  ),
  createdAt: v.number(),
});

/**
 * Get today's quotes for the authenticated user.
 * Returns session-derived and/or curated quote for today.
 */
export const getToday = query({
  args: {},
  returns: v.object({
    session: v.union(quoteValidator, v.null()),
    curated: v.union(quoteValidator, v.null()),
    hasSessionToday: v.boolean(),
    savedCount: v.number(),
    saveLocked: v.boolean(),
    sessionLocked: v.boolean(),
    replyReaches: v.boolean(),
    replyRemembered: v.boolean(),
  }),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    const today = utcDateString();

    const fiveDaysAgo = new Date(today + "T00:00:00Z").getTime() - 5 * 24 * 60 * 60 * 1000;

    const [quotes, sessionToday, isPremium, recentCompletedSession, preferences] = await Promise.all([
      ctx.db
        .query("daily_quotes")
        .withIndex("by_profile_date", (q) =>
          q.eq("emotionalProfileId", profile._id).eq("date", today)
        )
        .collect(),
      // Most recent completed session for this profile — checked against the
      // time window in JS rather than via a second index field, since state
      // is already pinned to "completed" by the index's second key.
      ctx.db
        .query("sessions")
        .withIndex("by_profile_state", (q) =>
          q.eq("emotionalProfileId", profile._id).eq("state", "completed")
        )
        .order("desc")
        .first()
        .then((s) => (s && s.createdAt >= new Date(today + "T00:00:00Z").getTime() ? s : null)),
      hasPremium(ctx, profile),
      // Mirrors the eligibility window in ai/quotesDistiller.ts loadEmotionalContext —
      // this is what would make a session-derived quote get generated for a premium user.
      ctx.db
        .query("sessions")
        .withIndex("by_profile_state", (q) =>
          q.eq("emotionalProfileId", profile._id).eq("state", "completed")
        )
        .order("desc")
        .first()
        .then((s) => (s && s.createdAt >= fiveDaysAgo ? s : null)),
      ctx.db
        .query("preferences")
        .withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
        .unique(),
    ]);

    // Session-derived (personalized) quotes are Xolace+ only — the LLM call is
    // skipped entirely for free users (see jobs/quotesGenerator.ts), so most free
    // users never have a `daily_quotes` row to withhold. `sessionLocked` instead
    // reflects whether they *would* have gotten one: either a row already exists
    // (e.g. downgraded after it was generated) or they have the recent session
    // history that would trigger generation.
    const sessionQuote = quotes.find((q) => q.type === "session") ?? null;

    return {
      session: isPremium ? sessionQuote : null,
      curated: quotes.find((q) => q.type === "curated") ?? null,
      hasSessionToday: sessionToday !== null,
      // The archive's count strip reads this — the profile row is already
      // loaded here, so it costs nothing over a second query.
      savedCount: profile.savedQuoteCount ?? 0,
      // Keeping a quote is Xolace+ (#317). The star is still rendered for a
      // free user — it opens the paywall instead of writing — so the archive
      // reads as a place that exists, not one that was hidden from them.
      // Unsaving stays free, so a downgrade never traps rows in the archive.
      saveLocked: !isPremium,
      sessionLocked: !isPremium && (sessionQuote !== null || recentCompletedSession !== null),
      // Whether a reply written now would actually reach tomorrow's quote:
      // premium AND inside the same session window generation needs (#313).
      // Not the inverse of `sessionLocked` — that predicate is false for a
      // premium user and for a free user with no history alike.
      replyReaches: isPremium && recentCompletedSession !== null,
      // Whether a reply also becomes episodic memory for the semantic profile
      // (ADR 0007). Free and premium alike — this one is not a feature you
      // receive, it is the memory toggle. The composer's confirmation copy
      // reads it so "This stays yours" can stop understating.
      replyRemembered: preferences?.personalMemoryEnabled !== false,
    };
  },
});

/**
 * Auth + ownership for every mutation that writes a quote row. The quote id
 * comes from the client, so the profile check is what stops one user patching
 * another's row.
 */
async function requireOwnQuote(ctx: MutationCtx, quoteId: Id<"daily_quotes">) {
  const { profile } = await requireAuth(ctx);
  const quote = await ctx.db.get("daily_quotes", quoteId);
  if (!quote) throw new Error("Quote not found");
  if (quote.emotionalProfileId !== profile._id) {
    throw new Error("Not your quote");
  }
  return { profile, quote };
}

/**
 * Set a reaction on today's displayed quote.
 * Pass quoteId of whichever quote is currently shown.
 *
 * @deprecated the `"not_today"` member of `reaction` — see the marker below.
 */
export const react = mutation({
  args: {
    quoteId: v.id("daily_quotes"),
    // DEPRECATED(remove-after: app >= 1.10.0): the "not_today" literal only.
    // #303 removed its control, so current clients only ever send "resonates".
    // Removing it THROWS, it does not degrade — a pre-#309 binary calling
    // react({reaction:"not_today"}) fails argument validation and the button
    // visibly breaks. Keep it until the supported version floor has passed.
    reaction: v.union(v.literal("resonates"), v.literal("not_today")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile } = await requireOwnQuote(ctx, args.quoteId);
    await ctx.db.patch("daily_quotes", args.quoteId, { reaction: args.reaction });
    // Zero weight: logged as history, never extends a streak on its own.
    await recordActivity(ctx, { emotionalProfileId: profile._id, actionType: "quotes" });
    return null;
  },
});

/**
 * Clear a reaction (toggle off).
 */
export const clearReaction = mutation({
  args: { quoteId: v.id("daily_quotes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireOwnQuote(ctx, args.quoteId);
    await ctx.db.patch("daily_quotes", args.quoteId, { reaction: undefined });
    return null;
  },
});

/**
 * Keep a quote. Populates the archive; independent of `reaction` (#311).
 * Idempotent — saving an already-saved quote leaves the timestamp and the
 * count alone, so a double tap can't inflate `savedQuoteCount`.
 *
 * Xolace+ only (#317). The client mirrors the gate via `getToday.saveLocked`;
 * this is the fence. `unsave` is deliberately NOT gated — a lapsed subscriber
 * must still be able to let go of what they kept.
 */
export const save = mutation({
  args: { quoteId: v.id("daily_quotes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile, quote } = await requireOwnQuote(ctx, args.quoteId);
    await requirePremium(ctx, profile, "saving quotes");
    if (quote.savedAt !== undefined) return null;

    await ctx.db.patch("daily_quotes", args.quoteId, { savedAt: Date.now() });
    await ctx.db.patch("emotional_profiles", profile._id, {
      savedQuoteCount: (profile.savedQuoteCount ?? 0) + 1,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Drop a quote from the archive. The row stays — only `savedAt` clears.
 */
export const unsave = mutation({
  args: { quoteId: v.id("daily_quotes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile, quote } = await requireOwnQuote(ctx, args.quoteId);
    if (quote.savedAt === undefined) return null;

    await ctx.db.patch("daily_quotes", args.quoteId, { savedAt: undefined });
    await ctx.db.patch("emotional_profiles", profile._id, {
      // clamped: a count that drifted low must never go negative
      savedQuoteCount: Math.max(0, (profile.savedQuoteCount ?? 0) - 1),
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * The cap on a reply. Client-side `maxLength` mirrors it; this is the fence.
 */
export const REPLY_MAX_LENGTH = 500;

/**
 * Write back to today's quote. One reply per quote — sending again overwrites,
 * which is what makes it editable.
 *
 * An action, because moderation is a network call. Deliberately softer than a
 * session's safety path: `moderateInput` only, no `evaluateSafeguard` and no
 * `escalation_events` row, because nothing was mirrored and there is no verdict
 * to record (docs/adr/0006-replies-cross-the-quote-metadata-boundary.md). A
 * flagged reply is still stored — it is the person's words, and dropping them
 * would be the one response worse than not asking. The client answers it with
 * crisis resources in place of the "Kept safe" confirmation.
 *
 * A reply cannot make a quote exist: nothing here touches the generation gate.
 */
export const reply = action({
  args: { quoteId: v.id("daily_quotes"), text: v.string() },
  returns: v.object({ flagged: v.boolean() }),
  handler: async (ctx, args): Promise<{ flagged: boolean }> => {
    const text = args.text.trim();
    if (text.length === 0) {
      throw new ConvexError({ code: "reply_empty", message: "Reply is empty" });
    }
    if (text.length > REPLY_MAX_LENGTH) {
      throw new ConvexError({
        code: "reply_too_long",
        message: `Reply exceeds ${REPLY_MAX_LENGTH} characters`,
      });
    }

    // Auth, ownership, and rate limit all land BEFORE the moderation call —
    // moderateInput is a paid external request, so nothing here can spend it
    // on behalf of an unauthenticated caller or someone else's quote.
    const { ok, retryAfter } = await ctx.runMutation(internal.dailyQuotes.beginReply, {
      quoteId: args.quoteId,
    });
    if (!ok) {
      throw new ConvexError({
        code: "rate_limited",
        message: `Too many replies. Try again in ${Math.ceil(retryAfter / 1000)}s`,
      });
    }

    const moderation = await moderateInput(text);
    // Moderation down is not a clean verdict. The reply is still kept — those
    // are the person's words — but marked so the quote prompt skips it.
    const unavailable = moderation === MODERATION_UNAVAILABLE;
    const categories = Object.entries(moderation.categories)
      .filter(([, hit]) => hit)
      .map(([name]) => name);

    await ctx.runMutation(internal.dailyQuotes.writeReply, {
      quoteId: args.quoteId,
      text,
      moderation: {
        flagged: moderation.flagged,
        categories,
        checkedAt: Date.now(),
        unavailable,
      },
    });

    return { flagged: moderation.flagged };
  },
});

/**
 * Internal: auth + ownership + rate limit for `reply`, charged BEFORE the
 * action spends a moderation call. A mutation because the rate limiter writes
 * its own usage row — an action has no ctx.db for that.
 */
export const beginReply = internalMutation({
  args: { quoteId: v.id("daily_quotes") },
  returns: v.object({ ok: v.boolean(), retryAfter: v.number() }),
  handler: async (ctx, args): Promise<{ ok: boolean; retryAfter: number }> => {
    const { profile } = await requireOwnQuote(ctx, args.quoteId);
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "quoteReply", {
      key: profile._id,
    });
    return { ok, retryAfter: retryAfter ?? 0 };
  },
});

/**
 * Internal: land a moderated reply on the row. Ownership is re-checked here
 * rather than in the action — auth propagates from the action, and this is the
 * only thing that actually writes.
 */
export const writeReply = internalMutation({
  args: {
    quoteId: v.id("daily_quotes"),
    text: v.string(),
    moderation: v.object({
      flagged: v.boolean(),
      categories: v.array(v.string()),
      checkedAt: v.number(),
      unavailable: v.optional(v.boolean()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireOwnQuote(ctx, args.quoteId);
    await ctx.db.patch("daily_quotes", args.quoteId, {
      reply: args.text,
      repliedAt: Date.now(),
      replyModeration: args.moderation,
    });
    // The reply also becomes episodic memory for the semantic profile — never
    // for the mirror (ADR 0007). Scheduled, not awaited: the embed is a network
    // call and the "Kept safe" confirmation must not wait on it. ingestReply
    // owns every gate (flagged / memory-off / cleared), so this stays one line
    // for every write path — an edit re-adds idempotently under the same key.
    await ctx.scheduler.runAfter(0, internal.episodicMemory.ingestReply, {
      quoteId: args.quoteId,
    });
    return null;
  },
});

/**
 * The archive: saved quotes, newest kept first.
 *
 * Deliberately not premium-gated, unlike `getToday`, which withholds today's
 * session quote from a lapsed user. What they kept while subscribed is theirs;
 * the gate is on *new* personalised quotes, not on taking back what was given.
 *
 * Not every past daily —
 * `gt("savedAt", 0)` is a range on the index, and unsaved rows carry an
 * undefined `savedAt` that sorts outside it.
 */
export const listSaved = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(quoteValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null())
    ),
  }),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);

    return await ctx.db
      .query("daily_quotes")
      .withIndex("by_profile_saved", (q) =>
        q.eq("emotionalProfileId", profile._id).gt("savedAt", 0)
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Internal: store a generated quote for a user.
 * Idempotent — skips if a quote of this type already exists for this date.
 */
export const store = internalMutation({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    date: v.string(),
    type: v.union(v.literal("session"), v.literal("curated")),
    text: v.string(),
    title: v.optional(v.string()),
    sessionContextIds: v.optional(v.array(v.id("sessions"))),
  },
  returns: v.id("daily_quotes"),
  handler: async (ctx, args) => {
    // Idempotency check
    const existing = await ctx.db
      .query("daily_quotes")
      .withIndex("by_profile_date_type", (q) =>
        q
          .eq("emotionalProfileId", args.emotionalProfileId)
          .eq("date", args.date)
          .eq("type", args.type)
      )
      .unique();

    if (existing) {
      console.log(
        `[dailyQuotes:store] Already exists for ${args.emotionalProfileId} ${args.date} ${args.type}, skipping`
      );
      return existing._id;
    }

    const id = await ctx.db.insert("daily_quotes", {
      emotionalProfileId: args.emotionalProfileId,
      date: args.date,
      type: args.type,
      text: args.text,
      title: args.title,
      sessionContextIds: args.sessionContextIds,
      isPremium: args.type === "session",
      reaction: undefined,
      createdAt: Date.now(),
    });

    return id;
  },
});

/**
 * Cold-start: immediately generate today's quotes for the current user.
 * Called when the user first visits the quotes screen or has no quotes today.
 */
export const coldStart = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    
    const profile: { _id: Id<"emotional_profiles"> } | null = await ctx.runQuery(
      internal.dailyQuotes.getMyProfile,
      {}
    );
    if (!profile) throw new Error("Not authenticated");

    // Schedule instead of awaiting — processUser calls Anthropic and can take
    // 30s+, which drops the WebSocket. The reactive getToday query pushes the
    // update to the client automatically when quotes land.
    await ctx.scheduler.runAfter(0, internal.jobs.quotesGenerator.processUser, {
      emotionalProfileId: profile._id,
    });
    return null;
  },
});

/**
 * Internal: get the authenticated user's emotional profile.
 */
export const getMyProfile = internalQuery({
  args: {},
  returns: v.union(v.object({ _id: v.id("emotional_profiles") }), v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || user.accountStatus !== "active") return null;
    const profile = await ctx.db.get("emotional_profiles", user.emotionalProfileId);
    return profile ? { _id: profile._id } : null;
  },
});

/**
 * Internal: check if quotes already generated for a user today.
 */
export const hasQuotesForToday = internalQuery({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    date: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const quotes = await ctx.db
      .query("daily_quotes")
      .withIndex("by_profile_date", (q) =>
        q.eq("emotionalProfileId", args.emotionalProfileId).eq("date", args.date)
      )
      .take(2);
    return quotes.length > 0;
  },
});
