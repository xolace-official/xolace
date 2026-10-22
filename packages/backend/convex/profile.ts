import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { hasPremium } from "./lib/premium";
import { insightFeatureValidator } from "./lib/validators";
import { generateDisplayName, seededDisplayName, validateDisplayName } from "./lib/displayName";
import { streakState } from "./streaks/state";
import { reflectionRank } from "./lib/aggregates";

/**
 * Full profile summary for the profile screen.
 * Reads denormalized profile fields + preferences in two bounded point reads.
 */
export const getSummary = query({
  args: {},
  returns: v.object({
    displayName: v.string(),
    avatarId: v.string(),
    firstSessionAt: v.union(v.number(), v.null()),
    sessionCount: v.number(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    dominantEmotionTags: v.array(v.string()),
    typicalUsagePattern: v.union(
      v.object({ dayOfWeek: v.number(), hourOfDay: v.number() }),
      v.null(),
    ),
    recentWords: v.array(v.object({ word: v.string(), count: v.number() })),
    wordCount: v.number(),
    premiumRequired: v.boolean(),
  }),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);

    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
      .unique();

    // Frequency-ranked language for the P5 words teaser. Read from the
    // denormalized profile field (recomputed in profileStats after each
    // session) — no scan on this hot, reactive query. Both the word and its
    // real count are premium-gated together: whichever rows are unlocked for
    // this tier ship their true count, everything else stays server-side.
    const premium = await hasPremium(ctx, profile);
    const allWords = profile.frequentWords ?? [];
    const recentWords = premium ? allWords.slice(0, 4) : allWords.slice(0, 1);

    return {
      displayName: prefs?.displayName ?? seededDisplayName(profile._id),
      avatarId: prefs?.avatarId ?? "default",
      firstSessionAt: profile.firstSessionAt ?? null,
      sessionCount: profile.sessionCount,
      // Derive live: the stored streak goes stale once a gap outruns the
      // freezes (it's only rewritten on a qualifying action).
      currentStreak: (await streakState(ctx, profile)).streak,
      // Raw, not live-derived: longest is a record and never decays. Fall back
      // to the stored streak for rows predating the field (pre-backfill).
      longestStreak: profile.longestStreak ?? profile.currentStreak,
      dominantEmotionTags: profile.dominantEmotionTags,
      typicalUsagePattern: profile.typicalUsagePattern ?? null,
      recentWords,
      // Genuine recurring-word count, independent of tier truncation — lets
      // the client decide teaser vs. empty state without seeing locked words.
      wordCount: allWords.length,
      premiumRequired: !premium,
    };
  },
});

/**
 * Mood delta — majority bucket from last 10 sessions with postSessionMood set.
 * Returns null if fewer than 3 data points (not enough to show a pattern).
 */
export const getMoodDelta = query({
  args: {},
  returns: v.union(
    v.null(),
    v.literal("lighter"),
    v.literal("same"),
    v.literal("heavier"),
    v.literal("unsure"),
    v.literal("mixed"),
  ),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);

    // Take last 30 sessions; filter in JS (bounded, one user's data).
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_profile_time", (q) => q.eq("emotionalProfileId", profile._id))
      .order("desc")
      .take(30);

    const moods = sessions
      .filter((s) => s.postSessionMood !== undefined)
      .slice(0, 10)
      .map((s) => s.postSessionMood as "lighter" | "same" | "heavier" | "unsure");

    if (moods.length < 3) return null;

    const counts: Record<string, number> = { lighter: 0, same: 0, heavier: 0, unsure: 0 };
    for (const m of moods) counts[m]++;

    const [topBucket, topCount] = (Object.entries(counts) as [string, number][]).reduce((a, b) =>
      b[1] > a[1] ? b : a
    );

    if (topCount / moods.length < 0.4) return "mixed" as const;
    return topBucket as "lighter" | "same" | "heavier" | "unsure" | "mixed";
  },
});

// Own sessions needed before the card appears. Matches the existing "rhythm"
// gate on the profile screen — below this, a rank says more about being new
// than about how you reflect.
const RANK_MIN_SESSIONS = 5;

// Reflectors needed before a percentile means anything. Under this, the number
// is noise dressed up as an insight, so the card withholds it.
//
// Overridable per-deployment because dev will never hold 50 real reflectors —
// without this, the card is permanently stuck in `warming` there and its ranked
// state is untestable. Set `RANK_MIN_POPULATION=2` on dev; leave it unset in
// prod so the honest floor applies.
// A malformed value must fall back to 50, not disable the floor: Number("abc")
// is NaN, and `population < NaN` is always false — the warming gate would
// silently vanish and tiny-population percentiles would ship as ranked.
const RANK_MIN_POPULATION = (() => {
  const parsed = Number(process.env.RANK_MIN_POPULATION);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
})();

/**
 * Percentile rank by session count, for the "among the fires" profile card.
 *
 * The population is everyone with at least one completed session — NOT every
 * signup. Including zero-session accounts would put a large block of people
 * below every active user, inflating everyone's percentile, and would make the
 * number track signup-abandonment (a marketing artifact) rather than the user's
 * own reflecting. The client copy says "people who reflect here" to match this
 * denominator exactly.
 *
 * Ties are excluded from the numerator, so "more than N%" means N% have
 * strictly fewer moments than you. Kept out of `getSummary` on purpose: this
 * query is invalidated whenever any user anywhere completes a session, and the
 * profile summary must not inherit that global churn.
 */
export const getReflectionRank = query({
  args: {},
  returns: v.union(
    v.object({
      status: v.literal("pending"),
      sessionCount: v.number(),
      threshold: v.number(),
      remaining: v.number(),
    }),
    v.object({
      status: v.literal("warming"),
      sessionCount: v.number(),
    }),
    v.object({
      status: v.literal("ranked"),
      percentile: v.number(),
      sessionCount: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);

    const mine = profile.sessionCount;

    // Withheld, not hidden: the card still renders and says what it's waiting
    // for. Returning the *reason* lets the copy be specific ("3 more moments")
    // instead of vague — a promise the user can actually act on.
    if (mine < RANK_MIN_SESSIONS) {
      return {
        status: "pending" as const,
        sessionCount: mine,
        threshold: RANK_MIN_SESSIONS,
        remaining: RANK_MIN_SESSIONS - mine,
      };
    }

    const reflectors = { lower: { key: 1, inclusive: true } } as const;
    const population = await reflectionRank.count(ctx, { bounds: reflectors });

    // The user has done their part; the sample hasn't. Distinct from "pending"
    // so we never tell someone to reflect more when that isn't what's missing.
    if (population < RANK_MIN_POPULATION) {
      return { status: "warming" as const, sessionCount: mine };
    }

    const below = await reflectionRank.count(ctx, {
      bounds: {
        lower: { key: 1, inclusive: true },
        upper: { key: mine, inclusive: false },
      },
    });

    // The cap is a defensive no-op: you are in the population but never in
    // your own `below` bucket, so this can't reach 100 on its own.
    const percentile = Math.min(Math.floor((below / population) * 100), 99);

    return { status: "ranked" as const, percentile, sessionCount: mine };
  },
});

// How far back a Plus user can page. Matches the longest data-retention
// tier ("1_year") — beyond this, earlier sessions are already purged.
const MAX_WEEKS_BACK = 52;
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatWeekLabel(weekStart: Date, weekEnd: Date): string {
  const lastDay = new Date(weekEnd.getTime() - 86_400_000);
  const sameMonth = weekStart.getMonth() === lastDay.getMonth();
  const start = `${MONTH_LABELS[weekStart.getMonth()]} ${weekStart.getDate()}`;
  const end = sameMonth
    ? `${lastDay.getDate()}`
    : `${MONTH_LABELS[lastDay.getMonth()]} ${lastDay.getDate()}`;
  return `${start}–${end}`;
}

/**
 * Intensity data for the P2 chart teaser (Mon–Sun), current week by default.
 * Free tier can only ever request the current week (weekOffset forced to 0
 * server-side); Plus can page up to MAX_WEEKS_BACK weeks into history.
 */
export const getWeekIntensity = query({
  args: { weekOffset: v.optional(v.number()) },
  returns: v.object({
    days: v.array(
      v.object({
        label: v.string(),
        dayName: v.string(),
        intensity: v.union(v.number(), v.null()),
        isToday: v.boolean(),
      }),
    ),
    peakDay: v.union(v.string(), v.null()),
    hasData: v.boolean(),
    premiumRequired: v.boolean(),
    weekOffset: v.number(),
    weekLabel: v.string(),
    isEarliestWeek: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    const premium = await hasPremium(ctx, profile);

    // v.number() is a Float64: NaN and ±Infinity pass validation and would
    // otherwise propagate into Invalid Date and NaN index bounds below.
    const rawOffset = args.weekOffset ?? 0;
    const requestedOffset = Number.isFinite(rawOffset) ? Math.trunc(rawOffset) : 0;
    const weekOffset = premium
      ? Math.max(-MAX_WEEKS_BACK, Math.min(0, requestedOffset))
      : 0;

    const now = Date.now();
    // Shift so Mon=0, Sun=6
    const dayOfWeek = (new Date(now).getDay() + 6) % 7;
    const currentWeekStart = new Date(now - dayOfWeek * 86_400_000);
    currentWeekStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(currentWeekStart.getTime() + weekOffset * 7 * 86_400_000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);

    const metadata = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_profile_createdAt", (q) =>
        q
          .eq("emotionalProfileId", profile._id)
          .gte("createdAt", weekStart.getTime())
          .lt("createdAt", weekEnd.getTime()),
      )
      .take(300);

    const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;
    const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const buckets: number[][] = [[], [], [], [], [], [], []];

    for (const m of metadata) {
      const idx = (new Date(m.createdAt).getDay() + 6) % 7;
      buckets[idx].push(m.intensity);
    }

    const todayIdx = weekOffset === 0 ? (new Date(now).getDay() + 6) % 7 : -1;

    const days = DAY_LABELS.map((label, i) => {
      const vals = buckets[i];
      const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      return { label, dayName: DAY_NAMES[i], intensity: avg, isToday: i === todayIdx };
    });

    const peakIdx = days.reduce<number | null>((best, d, i) => {
      if (d.intensity === null) return best;
      if (best === null) return i;
      return (days[i].intensity ?? 0) > (days[best].intensity ?? 0) ? i : best;
    }, null);

    return {
      days,
      peakDay: peakIdx !== null ? days[peakIdx].dayName : null,
      hasData: days.some((d) => d.intensity !== null),
      premiumRequired: !premium,
      weekOffset,
      weekLabel: weekOffset === 0 ? "This week" : formatWeekLabel(weekStart, weekEnd),
      isEarliestWeek: weekOffset <= -MAX_WEEKS_BACK,
    };
  },
});

/**
 * Record intent-only waitlist interest for a premium insight teaser.
 * Pre-billing desire signal — no price, no IAP. Idempotent per profile+feature.
 */
export const joinInsightWaitlist = mutation({
  args: { feature: insightFeatureValidator },
  returns: v.object({ alreadyJoined: v.boolean() }),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);

    const existing = await ctx.db
      .query("insight_waitlist")
      .withIndex("by_profile_feature", (q) =>
        q.eq("emotionalProfileId", profile._id).eq("feature", args.feature),
      )
      .unique();

    if (existing) return { alreadyJoined: true };

    await ctx.db.insert("insight_waitlist", {
      emotionalProfileId: profile._id,
      feature: args.feature,
      joinedAt: Date.now(),
    });
    return { alreadyJoined: false };
  },
});

/**
 * Features the authenticated profile has already joined the waitlist for.
 * Lets the teaser show an "already on the list" state on re-tap.
 */
export const listInsightWaitlist = query({
  args: {},
  returns: v.array(insightFeatureValidator),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    const rows = await ctx.db
      .query("insight_waitlist")
      .withIndex("by_profile_feature", (q) => q.eq("emotionalProfileId", profile._id))
      .take(20);
    return rows.map((r) => r.feature);
  },
});

/**
 * Update displayName. Max 30 chars. Emoji and symbols allowed.
 */
export const updateDisplayName = mutation({
  args: { displayName: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);

    const validated = validateDisplayName(args.displayName);
    if (!validated.ok) throw new Error(validated.message);
    const trimmed = validated.trimmed;

    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
      .unique();
    if (!prefs) throw new Error("Preferences not found");

    // Their own new name replaces any private one the companion used (#602).
    await ctx.db.patch("preferences", prefs._id, { displayName: trimmed, preferredName: undefined });
    return null;
  },
});
