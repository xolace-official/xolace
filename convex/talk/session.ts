import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, type MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { requireAuth, requireSessionOwnership } from "../lib/auth";
import { requirePremium } from "../lib/premium";
import { rateLimiter, SESSION_INITIATE_LIMITS_PLUS } from "../lib/rateLimits";
import { getDayOfWeek, getTimeOfDay } from "../lib/timeOfDay";
import { attachTo, markEnded, releaseUnconnected, reserveTalk } from "./openings";
import { personText } from "./transcript";
import { MAX_TURNS } from "../sessionTurns";
import { talkPreload } from "./remember";
import { patternRisk, type TalkPeak } from "../ai/safeguard";
import { markNameAsked, talkGreeting, talkSetup } from "./companion";

// Our endpoint ends a silent talk at about 60 s (#597), so a talk with no new
// line for this long is over: cut off, or ended without the client telling us (#588).
export const TALK_IDLE_MS = 5 * 60 * 1000;
// Far past a 15-min talk plus a 5-min "Say more".
export const MAX_TALK_LINES = 1000;

/**
 * Every opening (a talk, or a "Say more" reopening) spends the same initiate
 * budget as a typed Plus session: an opening mints an ElevenLabs token before
 * anything connects, and one that never connects refunds its time in full.
 * (Override spread as in sessions.initiate: the named limit's type doesn't list `config`.)
 */
export const limitTalkStart = (ctx: MutationCtx, profileId: Id<"emotional_profiles">) =>
  rateLimiter.limit(ctx, "sessionInitiate", {
    key: profileId,
    throws: true,
    ...{ config: SESSION_INITIATE_LIMITS_PLUS },
  });

/** A talk is a session (#592): created for the signed-in Plus person at talk start. */
export const start = internalMutation({
  args: { startedAt: v.number(), secret: v.string() },
  returns: v.object({
    sessionId: v.id("sessions"),
    talkKey: v.string(),
    ceilingS: v.number(),
    voiceId: v.string(),
    speed: v.number(),
    firstMessage: v.string(),
  }),
  handler: async (ctx, { startedAt, secret }) => {
    const { profile } = await requireAuth(ctx);
    await requirePremium(ctx, profile, "talk");
    await limitTalkStart(ctx, profile._id);
    const now = Date.now();
    const sessionId = await ctx.db.insert("sessions", {
      emotionalProfileId: profile._id,
      state: "initiated",
      entryType: "talk",
      kept: true,
      createdAt: now,
      updatedAt: now,
    });
    // Throws `talk_time_used` under the minimum, rolling the session back.
    const { ceilingS, talkKey } = await reserveTalk(ctx, profile._id, sessionId, { startedAt, secret });
    const { talkMemory, recall } = await talkPreload(ctx, profile, now);
    const opening = await historyOpening(ctx, profile._id, now);
    const setup = await talkSetup(ctx, profile._id);
    await ctx.db.patch("sessions", sessionId, {
      talkKey,
      ...setup.session,
      talkMemory,
      ...(recall ? { talkRecall: { lines: [], surfaced: [] } } : {}),
      ...(opening ? { talkSafety: opening } : {}),
    });
    // A talk that never serves a turn still gets closed.
    await ctx.scheduler.runAfter(TALK_IDLE_MS, internal.talk.session.finalizeIfIdle, { sessionId, talkKey });
    return {
      sessionId,
      talkKey,
      ceilingS,
      voiceId: setup.voiceId,
      speed: setup.speed,
      firstMessage: talkGreeting(setup.session.companionName),
    };
  },
});

/**
 * Pattern escalation at talk start (#599): 3+ of the last 5 sessions flagged
 * opens the talk in the elevated safety skill, help button showing. A
 * precaution, never mentioned to them, and never the session's level alone.
 */
async function historyOpening(
  ctx: MutationCtx,
  profileId: Doc<"sessions">["emotionalProfileId"],
  now: number,
): Promise<TalkPeak | null> {
  const recent = await ctx.db
    .query("emotional_metadata")
    .withIndex("by_profile_theme", (q) => q.eq("emotionalProfileId", profileId))
    .order("desc")
    .take(5);
  const { riskCount, windowCount } = patternRisk(recent, now);
  if (riskCount < 3) return null;
  return {
    level: "elevated",
    triggerType: "pattern_escalation",
    triggerConfidence: riskCount / windowCount,
    triggerEvidence: `Pattern: ${riskCount} of last ${windowCount} sessions within 48 hours had risk flags.`,
    fromHistory: true,
  };
}

/**
 * One check per opening, scheduled at its start: it reschedules itself for
 * the rest of the idle window while lines keep coming. `talkKey` ends the
 * chain once a "Say more" reopening (#604) started its own; checks scheduled
 * before it existed carry none.
 */
export const finalizeIfIdle = internalMutation({
  args: { sessionId: v.id("sessions"), talkKey: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { sessionId, talkKey }) => {
    const session = await ctx.db.get("sessions", sessionId);
    if (!session || session.entryType !== "talk" || session.state !== "initiated") return null;
    if (talkKey && talkKey !== session.talkKey) return null;
    const left = TALK_IDLE_MS - (Date.now() - session.updatedAt);
    if (left > 1000) {
      await ctx.scheduler.runAfter(left, internal.talk.session.finalizeIfIdle, {
        sessionId,
        talkKey: session.talkKey,
      });
      return null;
    }
    await finalizeTalk(ctx, session);
    return null;
  },
});

/** live.start's token request failed: the talk never begins. */
export const abandon = internalMutation({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get("sessions", sessionId);
    if (session) await finalizeTalk(ctx, session);
    return null;
  },
});

/**
 * The client's report once connected; the webhook deletes it on their side
 * (#595). A "Say more" reopening is a conversation of its own (#604).
 */
export const attachConversation = mutation({
  args: { sessionId: v.id("sessions"), conversationId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);
    if (session.entryType !== "talk" || args.conversationId.length > 200) {
      throw new ConvexError({ code: "not_a_talk" });
    }
    // Once per opening (a short talk can close before this lands): the ids
    // we later DELETE must stay the talk's own.
    if (session.talkKey) await attachTo(ctx, session, session.talkKey, args.conversationId);
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

// The talk's copy of what it knew of the person ends with the talk.
const FORGET = { talkMemory: undefined, talkRecall: undefined };

/**
 * The one way a talk closes, however it ended (#588). The person's lines go
 * through the typed pipeline; with nothing said there's no mirror, and the
 * abandoned-session sweep removes the session with its transcript. A
 * reopening (#604) remakes the mirror from the whole thread, or, with
 * nothing new said, goes back to the mirror it had.
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
  await markEnded(ctx, session._id, now);

  if (session.talkFromSeq !== undefined) {
    const reopened = lines.filter((l) => l.seq >= session.talkFromSeq!);
    if (!personText(reopened)) {
      // Nothing was added: the thread stays as its mirror saw it.
      for (const l of reopened) await ctx.db.delete("talk_turns", l._id);
      await ctx.db.patch("sessions", session._id, { state: "mirror_delivered", updatedAt: now, ...FORGET });
      await releaseUnconnected(ctx, session);
      return "mirror_delivered";
    }
    // The old mirror's audio would be kept over the new mirror's (generation skips when one exists).
    if (session.mirrorAudioStorageId) {
      await ctx.storage.delete(session.mirrorAudioStorageId);
      await ctx.db.patch("sessions", session._id, { mirrorAudioStorageId: undefined });
    }
    // The old mirror's refinement turns would cap the new one's action row.
    const turns = await ctx.db
      .query("session_turns")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .take(MAX_TURNS + 1);
    for (const t of turns) await ctx.db.delete("session_turns", t._id);
  }

  // The typed minimum is any words at all (the "Let it out" gate).
  if (!rawText) {
    await ctx.db.patch("sessions", session._id, { state: "abandoned", updatedAt: now, ...FORGET });
    await releaseUnconnected(ctx, session);
    return "abandoned";
  }

  // Their first real talk asked their name, answered or not (#602).
  if (session.askPersonName) await markNameAsked(ctx, session.emotionalProfileId);

  // Like submitInput, minus inputDuration/freeze: those read typing behavior.
  const startedAt = new Date(session.createdAt);
  await ctx.db.patch("sessions", session._id, {
    state: "processing",
    processingStage: undefined,
    rawInput: rawText,
    rawInputLength: rawText.length,
    // deliverMirror only raises these; a remade mirror starts from none.
    // escalationTriggered stays: escalation is sticky (see clarify).
    gapNamed: undefined,
    requiresFollowUp: undefined,
    ...FORGET,
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
