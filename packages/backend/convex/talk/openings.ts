/**
 * A talk's openings (the talk, and each "Say more" reopening, #604): the
 * reservation each makes, the conversation it attaches, and the webhook's
 * way back to its charge. The ledger itself is in ledger.ts.
 */
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mintTalkKey, REOPEN_CEILING_MS, TALK_CEILING_MS } from "./clock";
import { credits, release, topUp, weekStartOf } from "./ledger";

/** One talk's ceiling, before what's left of the week limits it. */
const TALK_CEILING_S = TALK_CEILING_MS / 1000;
const REOPEN_CEILING_S = REOPEN_CEILING_MS / 1000;
/** Under this, a talk isn't offered. */
export const MIN_START_S = 3 * 60;

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
export async function chargeFor(
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
