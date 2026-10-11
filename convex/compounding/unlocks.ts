/**
 * Unlock moments (#523; #490 §5, #513): the session whose reading moves a
 * domain out of warming gets a quiet session-end beat — a bigger one for the
 * first unlock. If the beat goes unseen, one generic push the next day in the
 * person's usual hour, at most one a week, through the usual preferences.
 * Every user, free too (signal unlocks, payment gates viewing). Settling
 * never pushes.
 */
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, mutation, type MutationCtx } from "../_generated/server";
import { isInQuietWindow } from "../jobs/notificationTriggers";
import { requireSessionOwnership } from "../lib/auth";
import { loadReadings } from "./readings";
import { computeSteadiness } from "./steadiness";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Hourly re-checks while the quiet window holds; past a day, let it go. */
const QUIET_RETRIES = 24;

/**
 * Stamp the domains this session unlocked and schedule the missed-beat push.
 * Replays state just before the session against state at it, so only the
 * session that brought a domain's third distinct day counts — whenever it's
 * evaluated. A domain already recorded unlocked stays so (#535), so it never
 * counts twice. Idempotent.
 */
export async function recordUnlock(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  { readings, timezone, unlocked }: Awaited<ReturnType<typeof loadReadings>>,
): Promise<void> {
  const stateAt = (now: number) =>
    new Map(computeSteadiness(readings, { now, timezone, unlocked }).domains.map((d) => [d.domain, d.state]));
  const before = stateAt(session.createdAt - 1);
  const at = [...stateAt(session.createdAt)].filter(([, state]) => state !== "warming");

  // Every open domain gets a stamp, not only this session's: one unlocked
  // before stamps existed is recorded the next time anyone comes back.
  const fresh = at
    .filter(([domain]) => !unlocked.some((u) => u.domain === domain))
    .map(([domain]) => ({ domain, at: session.createdAt }));
  if (fresh.length) {
    await ctx.db.patch("emotional_profiles", session.emotionalProfileId, {
      unlockedDomains: [...unlocked, ...fresh],
    });
  }

  if (session.domainUnlock) return;
  const domains = at
    .filter(([domain]) => (before.get(domain) ?? "warming") === "warming")
    .map(([domain]) => domain);
  if (domains.length === 0) return;

  const first = ![...before.values()].some((state) => state !== "warming");
  await ctx.db.patch("sessions", session._id, { domainUnlock: { domains, first } });
  const profile = await ctx.db.get("emotional_profiles", session.emotionalProfileId);
  await ctx.scheduler.runAt(
    missedPushAt(Date.now(), profile?.typicalUsagePattern?.hourOfDay),
    internal.compounding.unlocks.sendMissedPush,
    { sessionId: session._id },
  );
}

/**
 * Retention just purged sessions: a domain left no readings goes cold, so its
 * stamp goes and a return unlocks it afresh (CONTEXT.md). Its own transaction,
 * one per profile, so a page of retention stays within read limits.
 */
export const dropColdUnlocks = internalMutation({
  args: { profileId: v.id("emotional_profiles") },
  returns: v.null(),
  handler: async (ctx, { profileId }) => {
    const profile = await ctx.db.get("emotional_profiles", profileId);
    if (!profile?.unlockedDomains?.length) return null;
    const { readings, unlocked, truncated } = await loadReadings(ctx, profileId);
    // ponytail: past the read window a domain may still have older readings;
    // keep every stamp rather than replay an unlock. Exact once readings roll up.
    if (truncated) return null;
    const kept = unlocked.filter((u) => readings.some((r) => r.domain === u.domain));
    if (kept.length < unlocked.length) {
      await ctx.db.patch("emotional_profiles", profileId, { unlockedDomains: kept });
    }
    return null;
  },
});

/**
 * Next day, in their usual hour: the occurrence of `hourUtc` nearest this time
 * tomorrow (12–36h out). `typicalUsagePattern.hourOfDay` is a server (UTC)
 * hour. No pattern yet → this time tomorrow.
 */
export function missedPushAt(at: number, hourUtc?: number): number {
  const tomorrow = at + DAY;
  if (hourUtc === undefined) return tomorrow;
  const t = new Date(tomorrow).setUTCHours(hourUtc, 0, 0, 0);
  return t - tomorrow > 12 * HOUR ? t - DAY : tomorrow - t > 12 * HOUR ? t + DAY : t;
}

/** The beat showed at session end: the push stands down. */
export const markSeen = mutation({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, { sessionId }) => {
    const { session } = await requireSessionOwnership(ctx, sessionId);
    if (session.domainUnlock && session.domainUnlock.seenAt === undefined) {
      await ctx.db.patch("sessions", sessionId, {
        domainUnlock: { ...session.domainUnlock, seenAt: Date.now() },
      });
    }
    return null;
  },
});

/**
 * The beat went unseen. Generic text: the lock screen isn't private, so the
 * domain never leaves the app. Milestone family; the weekly cap is the
 * `domainUnlock` bucket in notifications.schedule.
 */
export const sendMissedPush = internalMutation({
  args: { sessionId: v.id("sessions"), quietRetries: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, { sessionId, quietRetries = 0 }) => {
    const session = await ctx.db.get("sessions", sessionId);
    if (!session?.domainUnlock || session.domainUnlock.seenAt !== undefined) return null;

    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", session.emotionalProfileId))
      .unique();
    const n = prefs?.notifications;
    if (!n?.enabled || !n.milestone) return null;
    if (n.quietWindow && n.timezone && isInQuietWindow(n.timezone, n.quietWindow.dontReachBefore, n.quietWindow.dontReachAfter)) {
      // Deferred, not dropped: try again once the window opens.
      if (quietRetries < QUIET_RETRIES) {
        await ctx.scheduler.runAfter(HOUR, internal.compounding.unlocks.sendMissedPush, {
          sessionId,
          quietRetries: quietRetries + 1,
        });
      }
      return null;
    }

    await ctx.scheduler.runAfter(0, internal.notifications.schedule, {
      emotionalProfileId: session.emotionalProfileId,
      type: "domain_unlock",
      title: "Something new is ready.",
      content: "Part of your Insights has come into focus.",
      triggerReason: "domain_unlock_missed",
      scheduledFor: Date.now(),
    });
    return null;
  },
});
