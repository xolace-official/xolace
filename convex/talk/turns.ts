import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { TALK_IDLE_MS } from "./session";
import { recallQuery } from "./remember";
import { raiseTalkSafety } from "./safety";
import { talkPeakValidator } from "../lib/validators";
import { requireSessionOwnership } from "../lib/auth";
import { MAX_TALK_LINES } from "./session";

const talkLineValidator = v.object({
  role: v.union(v.literal("person"), v.literal("companion")),
  text: v.string(),
});

/**
 * The Custom LLM endpoint's write (#588): binds a served turn to its talk and
 * keeps `talk_turns` in step with it. Returns false when the turn isn't this
 * talk's (wrong key, or the talk has closed): the endpoint serves nothing.
 *
 * Two calls per turn, because an interruption kills the endpoint mid-stream
 * (#591), so nothing that must land can wait for the end:
 * - as the turn starts, `lines`: the whole talk as ElevenLabs resent it. The
 *   last two stored rows are revised from it (a person line a speculative
 *   turn sent half-finished; the reply as actually spoken), then new lines
 *   are appended.
 * - after the stream, `reply`: the companion's turn we just served, stored
 *   provisionally at `reply.seq` until a resend says what was spoken. Stays
 *   when the talk ends on it.
 *
 * A "Say more" reopening (#604) is a new conversation numbering its lines
 * from 0: they land from `talkFromSeq`, and the earlier thread is never revised.
 *
 * `sessionId` is a string: it arrives from ElevenLabs, untrusted.
 */
export const syncLines = internalMutation({
  args: {
    sessionId: v.string(),
    talkKey: v.string(),
    lines: v.optional(v.array(talkLineValidator)),
    reply: v.optional(v.object({ seq: v.number(), text: v.string() })),
    // A phrase-check crisis (#599), known as the turn starts: here so help
    // is on screen before the crisis line is said.
    peak: v.optional(talkPeakValidator),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const sessionId = ctx.db.normalizeId("sessions", args.sessionId);
    const session = sessionId ? await ctx.db.get("sessions", sessionId) : null;
    if (
      !session ||
      session.entryType !== "talk" ||
      session.state !== "initiated" ||
      !session.talkKey ||
      session.talkKey !== args.talkKey
    ) {
      return false;
    }

    const recent = await ctx.db
      .query("talk_turns")
      .withIndex("by_session_and_seq", (q) => q.eq("sessionId", session._id))
      .order("desc")
      .take(2);
    const stored = recent.length ? recent[0].seq + 1 : 0;
    const from = session.talkFromSeq ?? 0;

    if (args.lines) {
      let changed = false;
      for (const row of recent) {
        const resent = row.seq >= from ? args.lines[row.seq - from] : undefined;
        if (resent && (row.provisional || resent.text !== row.text || resent.role !== row.role)) {
          await ctx.db.patch("talk_turns", row._id, { ...resent, provisional: undefined });
          changed = true;
        }
      }
      for (let seq = stored; seq < from + args.lines.length; seq++) {
        await ctx.db.insert("talk_turns", { sessionId: session._id, seq, ...args.lines[seq - from] });
        changed = true;
      }
      // The person said something new: recall in the background for the next turn (#598).
      const query = changed && session.talkRecall ? recallQuery(args.lines) : null;
      if (query) await ctx.scheduler.runAfter(0, internal.talk.remember.recall, { sessionId: session._id, query });
    }
    if (args.peak) await raiseTalkSafety(ctx, session, args.peak);

    const reply = args.reply && { seq: from + args.reply.seq, text: args.reply.text.trim() };
    if (reply?.text) {
      const at = recent.find((r) => r.seq === reply.seq);
      // A later turn's resend already holds this position: it wins.
      if (at?.provisional) await ctx.db.patch("talk_turns", at._id, { text: reply.text });
      else if (!at && reply.seq === stored) {
        await ctx.db.insert("talk_turns", {
          sessionId: session._id,
          seq: reply.seq,
          role: "companion",
          text: reply.text,
          provisional: true,
        });
      }
    }

    await ctx.db.patch("sessions", session._id, { updatedAt: Date.now() });
    await ctx.scheduler.runAfter(TALK_IDLE_MS, internal.talk.session.finalizeIfIdle, {
      sessionId: session._id,
    });
    return true;
  },
});

/**
 * A talk's thread, read-only: under its mirror on the timeline, and as the
 * talk screen opens again on "Say more" (#604).
 */
export const thread = query({
  args: { sessionId: v.id("sessions") },
  returns: v.array(talkLineValidator),
  handler: async (ctx, { sessionId }) => {
    const { session } = await requireSessionOwnership(ctx, sessionId);
    if (session.entryType !== "talk") return [];
    const lines = await ctx.db
      .query("talk_turns")
      .withIndex("by_session_and_seq", (q) => q.eq("sessionId", sessionId))
      .take(MAX_TALK_LINES);
    return lines.map(({ role, text }) => ({ role, text }));
  },
});
