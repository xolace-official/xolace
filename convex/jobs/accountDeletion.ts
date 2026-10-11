import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  drainActivityLog,
  drainFrozenDays,
  drainStretches,
  drainInsights,
  drainConsentRecords,
  drainEscalations,
  drainFeedback,
  drainLibraryReads,
  drainNotifications,
  drainProductFeedback,
  drainQuotes,
  drainReports,
  drainResonances,
  drainSessions,
  drainWaitlist,
} from "./accountDeletionSteps";
import {
  drainConversations,
  drainPushDevices,
  drainRatingsGiven,
  drainRatingsReceived,
  drainSemanticVersions,
  finalizePurge,
} from "./accountDeletionFinalize";

const USER_BATCH_SIZE = 10;

/**
 * Sweep entry point: find accounts marked "deleted" and hand each one to
 * `purgeUser`, which drains that user's data across as many transactions as
 * it takes. This function deliberately owns no per-user deletion logic —
 * a single mutation cannot bound a user with thousands of sessions.
 *
 * Each selected user is claimed (flipped "deleted" → "purging") in the same
 * transaction that schedules its drain. The claim moves the user out of the
 * "deleted" bucket this index scans, so a later cron tick advances to the
 * next unclaimed users instead of re-selecting an in-flight one and
 * enqueuing a duplicate purgeUser chain. Convex schedules the drain
 * atomically with this commit, so a claimed user always has a worker.
 */
export const purge = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const deletedUsers = await ctx.db
      .query("users")
      .withIndex("by_deletion", (q) => q.eq("accountStatus", "deleted"))
      .take(USER_BATCH_SIZE);

    if (deletedUsers.length === 0) return;

    for (const user of deletedUsers) {
      await ctx.db.patch("users", user._id, { accountStatus: "purging" });
      await ctx.scheduler.runAfter(
        0,
        internal.jobs.accountDeletion.purgeUser,
        { userId: user._id }
      );
    }
  },
});

/**
 * Drain one deleted user's data, one bounded batch per invocation.
 *
 * The user doc is what makes this user reachable by `purge`, and the profile
 * id is what makes their sub-tables reachable at all. Both are deleted ONLY
 * once every sweep below came back under its batch size — otherwise we
 * reschedule and leave the trail intact. Deleting them early would strand
 * every remaining session (and its rawInput) in the database permanently.
 */
export const purgeUser = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    if (!user) return;

    // Proceed only while this user is pending deletion. "purging" is the
    // sweep's claim on a drain we own; "deleted" covers a drain scheduled
    // before the claim step existed. Any other status means the grace
    // period reactivated the account (users.getOrCreate flips "deleted"
    // back to "active") — stop, their remaining data stays.
    if (user.accountStatus !== "deleted" && user.accountStatus !== "purging")
      return;

    const profileId = user.emotionalProfileId;

    // Each step drains one bounded batch and reports whether it was full.
    // `purgeSessions` also carries follow_up_cards / session_turns /
    // emotional_metadata / episodic entries with it (see sessionCascade.ts).
    const steps = [
      drainSessions,
      drainEscalations,
      drainConsentRecords,
      drainNotifications,
      drainResonances,
      drainReports,
      drainFeedback,
      drainProductFeedback,
      drainQuotes,
      drainWaitlist,
      drainConversations,
      drainRatingsGiven,
      drainRatingsReceived,
      drainSemanticVersions,
      drainPushDevices,
      drainLibraryReads,
      drainActivityLog,
      drainFrozenDays,
      drainStretches,
      drainInsights,
    ];

    let hasMore = false;
    for (const step of steps) {
      if (await step(ctx, profileId)) hasMore = true;
    }

    // More to drain? Come back before touching profile/user.
    if (hasMore) {
      await ctx.scheduler.runAfter(
        0,
        internal.jobs.accountDeletion.purgeUser,
        { userId: args.userId }
      );
      return;
    }

    // Everything below happens exactly once, deleting the profile and user
    // rows last.
    await finalizePurge(ctx, profileId, user._id);
  },
});
