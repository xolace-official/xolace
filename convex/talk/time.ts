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
 */
import { Credits } from "@clipin/convex-credits";
import { ConvexError, v } from "convex/values";
import { components } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { hasPremium } from "../lib/premium";
import { posthog } from "../posthog";
import { dayStartMs, localDayKey, shiftDayKey } from "../streaks/activityLog";
import { profileTimezone } from "../streaks/state";
import { mintTalkKey, REOPEN_CEILING_MS, TALK_CEILING_MS } from "./clock";

const credits = new Credits(components.credits);

export const WEEKLY_S = 15 * 60;
/** One talk's ceiling, before what's left of the week limits it. */
const TALK_CEILING_S = TALK_CEILING_MS / 1000;
const REOPEN_CEILING_S = REOPEN_CEILING_MS / 1000;
/** Under this, a talk isn't offered. */
export const MIN_START_S = 3 * 60;
// Webhook retries stop after ~40.5 min and the agent's backstop is 26 min.
const SWEEP_AFTER_MS = 2 * 60 * 60 * 1000;
const ALERT_AFTER_S = 16 * 60;
const BATCH = 100;

/** The local Monday ("YYYY-MM-DD") of the week `now` falls in. */
export function weekOf(now: number, timezone: string): string {
  const day = new Date(`${localDayKey(now, timezone)}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

async function openReservations(ctx: QueryCtx, profileId: Id<"emotional_profiles">) {
  // ponytail: a person has one or two open talks at most; 20 is generous.
  return ctx.db
    .query("talk_charges")
    .withIndex("by_emotionalProfileId", (q) => q.eq("emotionalProfileId", profileId))
    .take(20);
}

/** Seconds left this week, as the next ledger write will see it. */
async function secondsLeft(ctx: QueryCtx, profile: Doc<"emotional_profiles">, now: number) {
  const balance = await credits.balance(ctx, { owner: profile._id });
  const timezone = await profileTimezone(ctx, profile);
  const week = weekOf(now, timezone);
  const weekStart = dayStartMs(week, timezone);
  const resetsAt = dayStartMs(shiftDayKey(week, 7), timezone);
  if (profile.talkWeekOf && profile.talkWeekOf >= week) return { balance, week, weekStart, resetsAt, topUp: 0 };
  // This week's reservations are already out of the balance, so they count
  // toward the 900. Last week's don't: their leftover is forfeited.
  const open = (await openReservations(ctx, profile._id))
    .filter((r) => r.startedAt >= weekStart)
    .reduce((s, r) => s + r.reserved, 0);
  return { balance, week, weekStart, resetsAt, topUp: Math.max(0, WEEKLY_S - (balance + open)) };
}

async function topUp(ctx: MutationCtx, profileId: Id<"emotional_profiles">, now: number) {
  const profile = await ctx.db.get("emotional_profiles", profileId);
  if (!profile) return { balance: 0, weekStart: now };
  const { balance, week, weekStart, topUp } = await secondsLeft(ctx, profile, now);
  if (topUp > 0) {
    await credits.grant(ctx, {
      owner: profileId,
      amount: topUp,
      key: `talk:${profileId}:week:${week}`,
      reason: "weekly talk time",
      reference: week,
    });
  }
  // A timezone moved west can read an earlier week: never step back.
  if (!profile.talkWeekOf || profile.talkWeekOf < week) {
    await ctx.db.patch("emotional_profiles", profileId, { talkWeekOf: week });
  }
  return { balance: balance + topUp, weekStart };
}

/** A row from before #604 keeps the session's keys; an opening's own are apart. */
const keyOf = (row: Doc<"talk_charges">, step: string) =>
  row.talkKey ? `talk:${row.sessionId}:${row.talkKey}:${step}` : `talk:${row.sessionId}:${step}`;

/**
 * Gives a reservation back, unless it is last week's: that leftover was
 * forfeited at Monday's top-up, so it is charged in full instead.
 */
async function release(ctx: MutationCtx, row: Doc<"talk_charges">, weekStart: number) {
  if (row.startedAt < weekStart) {
    await credits.complete(ctx, { chargeId: row.chargeId, key: keyOf(row, "complete") });
  } else {
    await credits.release(ctx, { chargeId: row.chargeId, key: keyOf(row, "release") });
  }
  await ctx.db.delete("talk_charges", row._id);
}

/** The start of the week `now` falls in, in the profile's timezone. */
async function weekStartOf(ctx: QueryCtx, profileId: Id<"emotional_profiles">, now: number) {
  const profile = await ctx.db.get("emotional_profiles", profileId);
  if (!profile) return now;
  const timezone = await profileTimezone(ctx, profile);
  return dayStartMs(weekOf(now, timezone), timezone);
}

/** A session's open reservations: one per opening not settled yet. */
const chargesOf = (ctx: QueryCtx, sessionId: Id<"sessions">) =>
  ctx.db
    .query("talk_charges")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
    .take(10);

/**
 * At the start of a talk or a reopening: reserves its ceiling (15 or 5 min),
 * limited by what's left, and mints its key. Throws `talk_time_used` under
 * the 3-min minimum.
 */
export async function reserveTalk(
  ctx: MutationCtx,
  profileId: Id<"emotional_profiles">,
  sessionId: Id<"sessions">,
  key: { startedAt: number; secret: string; reopen?: boolean },
) {
  const now = Date.now();
  const { balance } = await topUp(ctx, profileId, now);
  if (balance < MIN_START_S) throw new ConvexError({ code: "talk_time_used" });
  const ceilingS = Math.min(key.reopen ? REOPEN_CEILING_S : TALK_CEILING_S, balance);
  const talkKey = mintTalkKey(key.startedAt, ceilingS, key.secret, key.reopen);
  const { chargeId } = await credits.reserve(ctx, {
    owner: profileId,
    amount: ceilingS,
    key: `talk:${sessionId}:${talkKey}:reserve`,
    reason: "talk",
    reference: sessionId,
  });
  await ctx.db.insert("talk_charges", {
    emotionalProfileId: profileId,
    sessionId,
    chargeId,
    reserved: ceilingS,
    startedAt: now,
    talkKey,
  });
  return { ceilingS, talkKey };
}

/** At a talk's close: its open charges are settling from here. */
export async function markEnded(ctx: MutationCtx, sessionId: Id<"sessions">, now: number) {
  for (const row of await chargesOf(ctx, sessionId)) {
    if (row.endedAt === undefined) await ctx.db.patch("talk_charges", row._id, { endedAt: now });
  }
}

/**
 * An opening that closed without ever connecting (no conversation attached,
 * so no webhook will come) gives its reserved time back at once, so a retry
 * isn't blocked for the sweeper's 2 h.
 */
export async function releaseUnconnected(ctx: MutationCtx, session: Doc<"sessions">) {
  const row = (await chargesOf(ctx, session._id)).find((r) =>
    r.talkKey ? r.talkKey === session.talkKey : !session.elevenLabsConversationId,
  );
  if (!row) return;
  const attached = row.talkKey && (await conversationsOf(ctx, session._id)).some((c) => c.talkKey === row.talkKey);
  if (!attached) await release(ctx, row, await weekStartOf(ctx, session.emotionalProfileId, Date.now()));
}

export const conversationsOf = (ctx: QueryCtx, sessionId: Id<"sessions">) =>
  ctx.db
    .query("talk_conversations")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
    .take(20);

/**
 * Records an opening's conversation, once: the ids we later DELETE. From the
 * client's report, or from the webhook when the app died before it.
 */
export async function attachTo(ctx: MutationCtx, session: Doc<"sessions">, talkKey: string, conversationId: string) {
  if ((await conversationsOf(ctx, session._id)).some((c) => c.talkKey === talkKey)) return;
  await ctx.db.insert("talk_conversations", { sessionId: session._id, talkKey, conversationId });
  if (!session.elevenLabsConversationId) {
    await ctx.db.patch("sessions", session._id, { elevenLabsConversationId: conversationId });
  }
}

/**
 * The webhook's session and the open charge of the opening it was for.
 * The echoed extra body names the opening; `sessionId` is untrusted, so its
 * key must match. Without it, the conversation id does.
 */
async function chargeFor(
  ctx: QueryCtx,
  conversationId: string,
  talk: { sessionId: string; talkKey: string } | undefined,
): Promise<{ session: Doc<"sessions">; row: Doc<"talk_charges"> | undefined } | null> {
  const byId = talk && ctx.db.normalizeId("sessions", talk.sessionId);
  const echoed = byId ? await ctx.db.get("sessions", byId) : null;
  if (echoed && talk) {
    const rows = await chargesOf(ctx, echoed._id);
    const own = rows.find((r) => r.talkKey === talk.talkKey);
    if (own) return { session: echoed, row: own };
    // Pre-#604, or already settled (a redelivery): the key on the session vouches.
    if (echoed.talkKey === talk.talkKey) return { session: echoed, row: rows.find((r) => !r.talkKey) };
  }
  const mapped = await ctx.db
    .query("talk_conversations")
    .withIndex("by_providerDeletedAt_and_conversationId", (q) =>
      q.eq("providerDeletedAt", undefined).eq("conversationId", conversationId),
    )
    .first();
  const session = mapped
    ? await ctx.db.get("sessions", mapped.sessionId)
    : await ctx.db
        .query("sessions")
        .withIndex("by_providerDeletedAt_and_elevenLabsConversationId", (q) =>
          q.eq("providerDeletedAt", undefined).eq("elevenLabsConversationId", conversationId),
        )
        .first();
  if (!session) return null;
  const rows = await chargesOf(ctx, session._id);
  return { session, row: rows.find((r) => (mapped ? r.talkKey === mapped.talkKey : !r.talkKey)) };
}

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
