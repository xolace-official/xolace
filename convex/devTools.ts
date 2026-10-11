/**
 * Dev-only helpers for manual testing. Every function is gated on the
 * DEV_TOOLS_ENABLED env var so these are inert on production — set it
 * with `bunx convex env set DEV_TOOLS_ENABLED true` on the dev deployment.
 */
import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import type { WorkflowId } from "@convex-dev/workflow";
import { internal } from "./_generated/api";
import { requireAuth } from "./lib/auth";
import { rankReplace, reflectionRank } from "./lib/aggregates";
import { migrations } from "./migrations";
import { localDayKey, shiftDayKey } from "./streaks/activityLog";
import { workflow } from "./followUps";
import { deleteResponsesForCard } from "./followUpResponses";

export function assertDevToolsEnabled() {
  if (process.env.DEV_TOOLS_ENABLED !== "true") {
    throw new Error("Dev tools are disabled on this deployment");
  }
}

/**
 * Force the caller's streak for testing the streak calendar reveal.
 * `bump` adds a day (simulates a new calendar day without waiting);
 * `reset` puts the profile back to day 1.
 *
 * Streak is denormalized on emotional_profiles — deleting session rows
 * never recomputes it, which is why this mutation exists.
 */
export const setStreak = mutation({
  args: { mode: v.union(v.literal("bump"), v.literal("reset")) },
  returns: v.number(),
  handler: async (ctx, args) => {
    assertDevToolsEnabled();
    const { profile } = await requireAuth(ctx);

    const newStreak = args.mode === "bump" ? profile.currentStreak + 1 : 1;
    await ctx.db.patch("emotional_profiles", profile._id, {
      currentStreak: newStreak,
      // Keep the user in the "active" variant (streak window is 48h)
      lastSessionAt: Date.now(),
      // computeUserVariant needs sessionCount > 0 to show the calendar
      sessionCount: Math.max(profile.sessionCount, 1),
    });
    // sessionCount can move 0→1 here — keep the percentile aggregate in step.
    await rankReplace(ctx, profile);
    return newStreak;
  },
});

/**
 * Wipe and rebuild the reflectionRank aggregate from the table. The repair for
 * drift flagged by jobs/rankAudit — e.g. the key-0 orphans that pre-fix
 * setStreak runs left on dev. Safe against live writes: the clear commits with
 * this mutation, the backfill runs after it in batches, and a session completed
 * in between lands via replaceOrInsert and is then skipped by the backfill's
 * insertIfDoesNotExist.
 *
 *   bunx convex run devTools:rebuildReflectionRank
 *
 * Verify afterwards (once the backfill finishes) with jobs/rankAudit:audit.
 */
export const rebuildReflectionRank = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    assertDevToolsEnabled();
    await reflectionRank.clear(ctx);
    // cursor: null restarts from the beginning even if a previous run completed.
    await migrations.runOne(ctx, internal.migrations.backfillReflectionRank, {
      cursor: null,
    });
    return null;
  },
});

/**
 * Seed a `ready` follow-up card for the caller so the check-in sheet can be
 * QA'd in the simulator without waiting for a real workflow ladder. Clears any
 * existing active cards first for a clean run. The workflowId is a placeholder
 * (the read path — sheet render, markShown, resolve — never touches it).
 */
export const seedFollowUpCard = mutation({
  args: {
    tier: v.union(
      v.literal("acute"),
      v.literal("elevated"),
      v.literal("standard"),
    ),
    escalationDerived: v.optional(v.boolean()),
    cardText: v.optional(v.string()),
  },
  returns: v.id("follow_up_cards"),
  handler: async (ctx, args) => {
    assertDevToolsEnabled();
    const { profile } = await requireAuth(ctx);

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_profile_time", (q) =>
        q.eq("emotionalProfileId", profile._id),
      )
      .order("desc")
      .first();
    if (!session) {
      throw new Error("No session to attach a follow-up card to — process one moment first.");
    }

    // Clear existing active cards so QA always shows exactly this one.
    for (const status of ["pending", "ready", "shown"] as const) {
      const existing = await ctx.db
        .query("follow_up_cards")
        .withIndex("by_profile_status", (q) =>
          q.eq("emotionalProfileId", profile._id).eq("status", status),
        )
        .collect();
      for (const c of existing) {
        await deleteResponsesForCard(ctx, c._id);
        await ctx.db.delete("follow_up_cards", c._id);
      }
    }

    const defaultText =
      args.tier === "acute"
        ? "Just checking in on you. We're here, no rush."
        : "A couple of days ago you let something heavy out here. How's it sitting now?";

    return await ctx.db.insert("follow_up_cards", {
      emotionalProfileId: profile._id,
      sessionId: session._id,
      workflowId: `qa-seed-${Date.now()}` as WorkflowId,
      tier: args.tier,
      cardText: args.cardText ?? defaultText,
      escalationDerived: args.escalationDerived ?? args.tier === "acute",
      status: "ready",
      createdAt: Date.now(),
    });
  },
});

/**
 * Cancel + retire any stuck follow-up cards for the caller. Use this to clear
 * the deadlocked workflow/card left behind by the old `Promise.race` cadence:
 * it cancels each active card's workflow (no-op for qa-seed placeholders and
 * already-terminal workflows), marks the card `expired`, and clears the
 * `followUpWorkflowId` pin on the linked session so a fresh follow-up can start.
 * Returns the number of cards retired.
 */
export const cleanupStuckFollowUps = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    assertDevToolsEnabled();
    const { profile } = await requireAuth(ctx);

    let retired = 0;
    for (const status of ["pending", "ready", "shown"] as const) {
      const cards = await ctx.db
        .query("follow_up_cards")
        .withIndex("by_profile_status", (q) =>
          q.eq("emotionalProfileId", profile._id).eq("status", status),
        )
        .collect();

      for (const card of cards) {
        try {
          await workflow.cancel(ctx, card.workflowId);
        } catch {
          // Placeholder workflowId or already-terminal workflow — nothing to do.
        }
        await ctx.db.patch("follow_up_cards", card._id, { status: "expired" });

        // Unpin the session so getStartContext won't treat it as already-started.
        const session = await ctx.db.get("sessions", card.sessionId);
        if (session?.followUpWorkflowId) {
          await ctx.db.patch("sessions", card.sessionId, { followUpWorkflowId: undefined });
        }
        retired += 1;
      }
    }
    return retired;
  },
});

/**
 * Seed a published xolacer so the Connect roster has something in it.
 * Takes an explicit user id (rather than requireAuth) so it can promote a
 * *different* test account than the one signed into the simulator — which is
 * exactly why it's `internalMutation`: an unauthenticated, public function
 * that flips `isXolacer` on an arbitrary user would be an impersonation
 * hole the moment DEV_TOOLS_ENABLED reached a real deployment.
 *
 *   bunx convex run devTools:seedXolacer '{"userId":"...","displayName":"Maya","bio":"..."}'
 */
export const seedXolacer = internalMutation({
  args: {
    userId: v.id("users"),
    displayName: v.string(),
    bio: v.string(),
    photoUrl: v.optional(v.string()),
  },
  returns: v.id("emotional_profiles"),
  handler: async (ctx, args) => {
    assertDevToolsEnabled();

    const user = await ctx.db.get("users", args.userId);
    if (!user) throw new Error("No such user");
    await ctx.db.patch("users", user._id, { isXolacer: true });

    const emotionalProfileId = user.emotionalProfileId;
    const existing = await ctx.db
      .query("xolacer_profiles")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", emotionalProfileId))
      .unique();

    const fields = {
      displayName: args.displayName,
      bio: args.bio,
      photoUrl: args.photoUrl,
      complete: true,
      active: true,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch("xolacer_profiles", existing._id, fields);
      return emotionalProfileId;
    }
    await ctx.db.insert("xolacer_profiles", {
      emotionalProfileId,
      createdAt: Date.now(),
      ...fields,
    });
    return emotionalProfileId;
  },
});

/**
 * Put the caller back at the start of intake.
 *
 * `onboardingComplete` is the root layout's guard, so flipping it false is the
 * whole trick — the next render mounts `(intake)` again. The answers row is
 * left alone: `intake.complete` overwrites it by profile, and keeping it means
 * a replay exercises the update path rather than only the insert.
 */
export const resetIntake = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    assertDevToolsEnabled();
    const { profile } = await requireAuth(ctx);
    await ctx.db.patch("emotional_profiles", profile._id, {
      onboardingComplete: false,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Seed an active kindling on a completed session so the kindling screen
 * (#333) can be exercised without a qualifying Plus session. Archives any
 * active one first, like the real writer does.
 *   bunx convex run devTools:seedKindling '{"sessionId":"..."}'
 */
export const seedKindling = internalMutation({
  args: { sessionId: v.id("sessions") },
  returns: v.id("paths"),
  handler: async (ctx, args) => {
    assertDevToolsEnabled();
    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session) throw new Error("No such session");
    const emotionalProfileId = session.emotionalProfileId;

    const previous = await ctx.db
      .query("paths")
      .withIndex("by_profile_and_status", (q) =>
        q.eq("emotionalProfileId", emotionalProfileId).eq("status", "active"),
      )
      .take(10);
    for (const p of previous) await ctx.db.patch("paths", p._id, { status: "replaced" });

    const pathId = await ctx.db.insert("paths", {
      emotionalProfileId,
      sessionId: session._id,
      status: "active",
      model: "qa-seed",
      modelVersion: "qa-seed",
      generatedAt: Date.now(),
    });
    const track = await ctx.db.query("audio_tracks").first();
    const twigs = [
      {
        actionType: "breathing",
        order: 1,
        why: "You said it was hard to catch your breath. Take a few slow rounds here.",
        params: { exercise: "sit-with-this" },
      },
      ...(track
        ? [{
            actionType: track.topic,
            order: 2,
            why: "The quiet came up more than once. Here's something soft to fill it.",
            params: { slug: track.slug },
          }]
        : []),
      {
        actionType: "xolacer",
        order: 3,
        why: "Feeling alone kept coming up. A xolacer who's felt the same is around.",
        params: { specialty: "burnout" },
      },
    ];
    for (const t of twigs) {
      await ctx.db.insert("path_steps", { pathId, ...t, state: "pending" });
    }
    return pathId;
  },
});

/**
 * Stage a revivable break (#437): a `streak`-day run whose last covered day
 * was two local days ago, no freezes to bridge the miss, one streak saver on
 * hand (pass `savers: 0` to see the silent reset). Deletes the profile's activity_log and frozen_days rows from yesterday
 * on, so the missed day is really missed.
 *   bunx convex run devTools:seedRevive '{"emotionalProfileId":"...","streak":5}'
 */
export const seedRevive = internalMutation({
  args: { emotionalProfileId: v.id("emotional_profiles"), streak: v.number(), savers: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertDevToolsEnabled();
    const profileId = args.emotionalProfileId;
    const preferences = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", profileId))
      .unique();
    const yesterday = shiftDayKey(localDayKey(Date.now(), preferences?.notifications.timezone ?? "UTC"), -1);

    const logs = await ctx.db
      .query("activity_log")
      .withIndex("by_emotionalProfileId_and_dayKey_and_actionType", (q) => q.eq("emotionalProfileId", profileId).gte("dayKey", yesterday))
      .take(50);
    const frozen = await ctx.db
      .query("frozen_days")
      .withIndex("by_emotionalProfileId_and_dayKey", (q) => q.eq("emotionalProfileId", profileId).gte("dayKey", yesterday))
      .take(50);
    for (const row of logs) await ctx.db.delete("activity_log", row._id);
    for (const row of frozen) await ctx.db.delete("frozen_days", row._id);
    // The run's last covered day is the day before the miss. Acked, so the
    // streak-held screen (#436) doesn't claim it.
    const lastCovered = shiftDayKey(yesterday, -1);
    const covered = await ctx.db
      .query("frozen_days")
      .withIndex("by_emotionalProfileId_and_dayKey", (q) => q.eq("emotionalProfileId", profileId).eq("dayKey", lastCovered))
      .first();
    if (!covered) {
      await ctx.db.insert("frozen_days", { emotionalProfileId: profileId, dayKey: lastCovered, createdAt: Date.now() });
    }

    await ctx.db.patch("emotional_profiles", profileId, {
      freezeAckedDay: lastCovered,
      currentStreak: args.streak,
      streakSavers: args.savers ?? 1,
      streakFreezes: 0,
      streakRevivedDay: undefined,
      brokenStreak: undefined,
    });
    return null;
  },
});
