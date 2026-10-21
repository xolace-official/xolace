/**
 * Weekly talk time (#596, decided in #582): 15 min a week for all of Plus,
 * topped up to on the person's local Monday. The one way into the credits
 * ledger (1 credit = 1 s; owner = the profile id), so the component can be
 * vendored under the same mount name without touching callers.
 *
 * A talk reserves its ceiling at start, then the post-call webhook charges
 * the connected duration ElevenLabs reports and refunds the rest. Keys are
 * per opening (the talk, or a "Say more" reopening, #604), not conversation:
 * the conversation id arrives after the reservation. Every write tops up
 * first. A reservation from before Monday is last week's: it doesn't count
 * toward the new 900, and what it didn't use is forfeited (as any leftover
 * is at Monday), not refunded onto the new week.
 *
 * The ledger outlives account deletion and data wipe (no text, ids and
 * amounts only; the component has no delete). Documented under "Survives
 * deletion" in docs/foundation/xolace-technical.md. Purging it on deletion
 * means vendoring the component.
 */
import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { hasPremium } from "../lib/premium";
import { posthog } from "../posthog";
import { credits, keyOf, openReservations, release, secondsLeft, topUp } from "./ledger";
import { attachTo, chargeFor } from "./openings";

// Webhook retries stop after ~40.5 min and the agent's backstop is 26 min.
const SWEEP_AFTER_MS = 2 * 60 * 60 * 1000;
const ALERT_AFTER_S = 16 * 60;
const BATCH = 100;

/**
 * Minutes for the door, consent card, mirror and settings. Null off Plus.
 * `resetsAt` is when this answer's week ends in the profile's timezone: a
 * query doesn't re-run as time passes, so the client ignores an answer past
 * it. The device's own Monday must not decide (its clock can sit either side
 * of the server's). `week` is that Monday, kept for the shipped UI.
 * `settling`: a talk has ended but its charge hasn't landed, so the number is
 * low for now.
 */
export const left = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({ secondsLeft: v.number(), week: v.string(), resetsAt: v.number(), settling: v.boolean() }),
  ),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    if (!(await hasPremium(ctx, profile))) return null;
    const { balance, week, resetsAt, topUp } = await secondsLeft(ctx, profile, Date.now());
    // Not the session: every turn patches it, and this would re-run with it.
    const settling = (await openReservations(ctx, profile._id)).some((r) => r.endedAt !== undefined);
    return { secondsLeft: balance + topUp, week, resetsAt, settling };
  },
});

/**
 * The post-call webhook's charge: the connected duration, capped at what was
 * reserved. Idempotent: the open row goes with the first delivery.
 */
export const settle = internalMutation({
  args: {
    conversationId: v.string(),
    durationS: v.number(),
    // The extra body ElevenLabs echoes back, so a talk the client never
    // attached is still charged. `sessionId` is untrusted: the key must match.
    talk: v.optional(v.object({ sessionId: v.string(), talkKey: v.string() })),
  },
  returns: v.null(),
  handler: async (ctx, { conversationId, durationS, talk }) => {
    const found = await chargeFor(ctx, conversationId, talk);
    // Settled already: a redelivery.
    if (!found?.row) return null;
    const { session, row } = found;
    // The echoed key proves the opening: attach here, else a talk the app
    // never attached is never pending and its provider copy stays forever.
    if (talk && (row.talkKey === talk.talkKey || session.talkKey === talk.talkKey)) {
      await attachTo(ctx, session, talk.talkKey, conversationId);
    }

    // No talk extends past its ceiling, crisis included (#581).
    if (durationS > ALERT_AFTER_S) {
      console.error("[talk] alert: talk past 16 min", session._id, durationS);
      await posthog.capture(ctx, {
        distinctId: session.emotionalProfileId,
        event: "talk_duration_alert",
        properties: { sessionId: session._id, durationS },
      });
    }
    const { weekStart } = await topUp(ctx, row.emotionalProfileId, Date.now());

    const used = Math.min(row.reserved, Math.max(0, Math.ceil(durationS)));
    // Last week's talk: its unused time was forfeited at Monday, not refunded.
    const forfeit = row.startedAt < weekStart;
    if (used === 0 || forfeit) {
      await release(ctx, row, weekStart);
      return null;
    }
    await credits.complete(ctx, { chargeId: row.chargeId, key: keyOf(row, "complete") });
    if (row.reserved > used) {
      await credits.refund(ctx, {
        chargeId: row.chargeId,
        amount: row.reserved - used,
        key: keyOf(row, "refund"),
        reason: "unused talk time",
      });
    }
    await ctx.db.delete("talk_charges", row._id);
    return null;
  },
});

/** Cron: releases reservations whose webhook never arrived. */
export const sweep = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    // ponytail: 100 per hourly run, no reschedule; fine while lost webhooks are rare.
    const stale = await ctx.db
      .query("talk_charges")
      .withIndex("by_startedAt", (q) => q.lt("startedAt", now - SWEEP_AFTER_MS))
      .take(BATCH);
    for (const row of stale) {
      const { weekStart } = await topUp(ctx, row.emotionalProfileId, now);
      await release(ctx, row, weekStart);
    }
    return null;
  },
});
