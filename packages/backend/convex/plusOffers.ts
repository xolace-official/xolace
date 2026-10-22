import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { hasPremium } from "./lib/premium";
import { streakState } from "./streaks/state";
import {
  gapObservation,
  milestoneObservation,
  patternObservation,
} from "./lib/plusOfferObservations";

/** A week of metadata is what the observation line is allowed to speak about. */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** Bounded scans: one user's own recent rows, never a table walk. */
const RECENT_SESSIONS = 10;
const RECENT_METADATA = 30;

/**
 * Everything the three proactive-offer call sites need to ask
 * `choosePlusOffer` a question — in one reactive read, so session end, the
 * mirror-landed beat and the profile insight all decide off the same facts.
 *
 * Server-side because every condition here is already known server-side: the
 * counts on the profile, the gap between the last two completed sessions, and
 * the recurrence in `emotional_metadata` that the words teaser is already
 * aggregated from. No model call is made for any of it (Cognition Layer
 * Constitution Rule) — a "pattern" here is arithmetic over a closed tag set.
 */
export const offerContext = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      now: v.number(),
      registerComplaint: v.boolean(),
      safeguardActive: v.boolean(),
      sessionId: v.union(v.id("sessions"), v.null()),
      previousSessionId: v.union(v.id("sessions"), v.null()),
      completedCount: v.number(),
      firstSession: v.boolean(),
      gapObservation: v.union(v.string(), v.null()),
      milestoneObservation: v.union(v.string(), v.null()),
      patternObservation: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);

    // A subscriber has nothing to be offered. Returning early also keeps the
    // scans below off the hot path for the users least likely to need them.
    if (await hasPremium(ctx, profile)) return null;

    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
      .unique();

    const recent = await ctx.db
      .query("sessions")
      .withIndex("by_profile_time", (q) =>
        q.eq("emotionalProfileId", profile._id),
      )
      .order("desc")
      .take(RECENT_SESSIONS);

    // The one absolute rule (#220 rule 4). Read off the session in play rather
    // than a flag the client passes, so no call site can forget to send it.
    const latest = recent[0];
    const safeguardActive =
      latest?.escalationTriggered === true ||
      latest?.safeguardLevel === "elevated" ||
      latest?.safeguardLevel === "crisis";

    // The gap belongs to the session that just closed, so it is measured
    // between the two most recent *completed* sessions — `lastSessionAt` on the
    // profile has already been moved forward by the one we are closing.
    const completed = recent.filter((s) => s.state === "completed");
    const gapMs =
      completed.length >= 2
        ? (completed[0].completedAt ?? completed[0].createdAt) -
          (completed[1].completedAt ?? completed[1].createdAt)
        : null;

    const now = Date.now();
    const weekMetadata = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_profile_createdAt", (q) =>
        q.eq("emotionalProfileId", profile._id).gte("createdAt", now - WEEK_MS),
      )
      .order("desc")
      .take(RECENT_METADATA);

    return {
      /**
       * Query time, so the client can run the cadence maths without reaching
       * for a clock mid-render. Refreshed with the rest of this reactive read.
       */
      now,
      registerComplaint: prefs?.registerComplaint === true,
      safeguardActive,
      /** Whatever session is in play — the active one mid-flow, the one that just closed at session end. */
      sessionId: latest?._id ?? null,
      /** Feeds the "never two sessions in a row" rule. */
      previousSessionId: recent[1]?._id ?? null,
      /** Completed sessions. 0 while the user's first one is still in flight. */
      completedCount: profile.sessionCount,
      firstSession: profile.sessionCount === 1,
      gapObservation: gapMs === null ? null : gapObservation(gapMs),
      milestoneObservation: milestoneObservation({
        streak: (await streakState(ctx, profile, now)).streak,
        sessionCount: profile.sessionCount,
      }),
      patternObservation: patternObservation(
        weekMetadata.map((m) => [...m.userLanguageTags, ...m.thematicTags]),
      ),
    };
  },
});
