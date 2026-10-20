import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, type MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { requireAuth, requireSessionOwnership } from "../lib/auth";
import { requirePremium } from "../lib/premium";
import { rateLimiter, SESSION_INITIATE_LIMITS_PLUS } from "../lib/rateLimits";
import { getDayOfWeek, getTimeOfDay } from "../lib/timeOfDay";
import { personText } from "./transcript";

// ElevenLabs ends a silent talk at 60 s, so a talk with no new line for this
// long is over: cut off, or ended without the client telling us (#588).
export const TALK_IDLE_MS = 5 * 60 * 1000;
// Far past a 15-min talk plus a 5-min "Say more".
const MAX_TALK_LINES = 1000;

/** A talk is a session (#592): created for the signed-in Plus person at talk start. */
export const start = internalMutation({
  args: { talkKey: v.string() },
  returns: v.id("sessions"),
  handler: async (ctx, { talkKey }) => {
    const { profile } = await requireAuth(ctx);
    await requirePremium(ctx, profile, "talk");
    // The same initiate budget as a typed Plus session (override spread as
    // in sessions.initiate: the named limit's type doesn't list `config`).
    await rateLimiter.limit(ctx, "sessionInitiate", {
      key: profile._id,
      throws: true,
      ...{ config: SESSION_INITIATE_LIMITS_PLUS },
    });
    const now = Date.now();
    const sessionId = await ctx.db.insert("sessions", {
      emotionalProfileId: profile._id,
      state: "initiated",
      entryType: "talk",
      kept: true,
      talkKey,
      createdAt: now,
      updatedAt: now,
    });
    // A talk that never serves a turn still gets closed.
    await ctx.scheduler.runAfter(TALK_IDLE_MS, internal.talk.session.finalizeIfIdle, { sessionId });
    return sessionId;
  },
});

export const finalizeIfIdle = internalMutation({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get("sessions", sessionId);
    // A later line scheduled its own check; that one decides.
    if (!session || Date.now() - session.updatedAt < TALK_IDLE_MS - 1000) return null;
    await finalizeTalk(ctx, session);
    return null;
  },
});

/** The client's report once connected; the webhook deletes it on their side (#595). */
export const attachConversation = mutation({
  args: { sessionId: v.id("sessions"), conversationId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);
    if (session.entryType !== "talk" || args.conversationId.length > 200) {
      throw new ConvexError({ code: "not_a_talk" });
    }
    // Write once: the id we later DELETE must stay the talk's own.
    if (!session.elevenLabsConversationId) {
      await ctx.db.patch("sessions", session._id, { elevenLabsConversationId: args.conversationId });
    }
    return null;
  },
});

/**
 * The person ended the talk, or the companion did (end_call). True when a
 * mirror is on its way: the client moves to the processing → mirror screens.
 */
export const end = mutation({
  args: { sessionId: v.id("sessions") },
  returns: v.boolean(),
  handler: async (ctx, { sessionId }) => {
    const { session } = await requireSessionOwnership(ctx, sessionId);
    if (session.entryType !== "talk") throw new ConvexError({ code: "not_a_talk" });
    return (await finalizeTalk(ctx, session)) !== "abandoned";
  },
});

/**
 * The one way a talk closes, however it ended (#588). The person's lines go
 * through the typed pipeline; with nothing said there's no mirror, and the
 * abandoned-session sweep removes the session with its transcript.
 * Idempotent: anything past `initiated` is already closed.
 */
export async function finalizeTalk(
  ctx: MutationCtx,
  session: Doc<"sessions">,
): Promise<Doc<"sessions">["state"]> {
  if (session.entryType !== "talk" || session.state !== "initiated") return session.state;

  const lines = await ctx.db
    .query("talk_turns")
    .withIndex("by_session_and_seq", (q) => q.eq("sessionId", session._id))
    .take(MAX_TALK_LINES);
  const rawText = personText(lines);
  const now = Date.now();

  // The typed minimum is any words at all (the "Let it out" gate).
  if (!rawText) {
    await ctx.db.patch("sessions", session._id, { state: "abandoned", updatedAt: now });
    return "abandoned";
  }

  // Like submitInput, minus inputDuration/freeze: those read typing behavior.
  const startedAt = new Date(session.createdAt);
  await ctx.db.patch("sessions", session._id, {
    state: "processing",
    processingStage: undefined,
    rawInput: rawText,
    rawInputLength: rawText.length,
    timeOfDay: getTimeOfDay(startedAt),
    dayOfWeek: getDayOfWeek(startedAt),
    updatedAt: now,
  });
  await ctx.scheduler.runAfter(0, internal.ai.process.generateMirror, {
    sessionId: session._id,
    rawText,
  });
  return "processing";
}
