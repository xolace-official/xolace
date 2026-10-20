import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { TALK_IDLE_MS } from "./session";
import type { TalkClock } from "./clock";

const talkLineValidator = v.object({
  role: v.union(v.literal("person"), v.literal("companion")),
  text: v.string(),
});

// Past the check-in and the goodbye, more companion lines all read as "long quiet".
const SILENCE_LOOKBACK = 4;

/**
 * The Custom LLM endpoint's write (#588): binds a served turn to its talk and
 * keeps `talk_turns` in step with it. Returns the talk clock (#597) from our
 * record: time used since the session started and, when the resent talk ends
 * on the companion (a `turn_timeout` re-engage), how many companion lines
 * since the person's last. Null when the turn isn't this talk's (wrong key,
 * or the talk has closed): the endpoint serves nothing.
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
 * `sessionId` is a string: it arrives from ElevenLabs, untrusted.
 */
export const syncLines = internalMutation({
  args: {
    sessionId: v.string(),
    talkKey: v.string(),
    lines: v.optional(v.array(talkLineValidator)),
    reply: v.optional(v.object({ seq: v.number(), text: v.string() })),
  },
  returns: v.union(v.null(), v.object({ elapsedMs: v.number(), silentTurns: v.union(v.number(), v.null()) })),
  handler: async (ctx, args): Promise<TalkClock | null> => {
    const sessionId = ctx.db.normalizeId("sessions", args.sessionId);
    const session = sessionId ? await ctx.db.get("sessions", sessionId) : null;
    if (
      !session ||
      session.entryType !== "talk" ||
      session.state !== "initiated" ||
      !session.talkKey ||
      session.talkKey !== args.talkKey
    ) {
      return null;
    }

    const recent = await ctx.db
      .query("talk_turns")
      .withIndex("by_session_and_seq", (q) => q.eq("sessionId", session._id))
      .order("desc")
      .take(2);
    const stored = recent.length ? recent[0].seq + 1 : 0;

    if (args.lines) {
      for (const row of recent) {
        const resent = args.lines[row.seq];
        if (resent && (row.provisional || resent.text !== row.text || resent.role !== row.role)) {
          await ctx.db.patch("talk_turns", row._id, { ...resent, provisional: undefined });
        }
      }
      for (let seq = stored; seq < args.lines.length; seq++) {
        await ctx.db.insert("talk_turns", { sessionId: session._id, seq, ...args.lines[seq] });
      }
    }

    const reply = args.reply && { seq: args.reply.seq, text: args.reply.text.trim() };
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

    const now = Date.now();
    await ctx.db.patch("sessions", session._id, { updatedAt: now });
    await ctx.scheduler.runAfter(TALK_IDLE_MS, internal.talk.session.finalizeIfIdle, {
      sessionId: session._id,
    });

    let silentTurns: number | null = null;
    if (args.lines?.at(-1)?.role === "companion") {
      const tail = await ctx.db
        .query("talk_turns")
        .withIndex("by_session_and_seq", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(SILENCE_LOOKBACK);
      const lastPerson = tail.findIndex((r) => r.role === "person");
      silentTurns = lastPerson === -1 ? tail.length : lastPerson;
    }
    return { elapsedMs: now - session.createdAt, silentTurns };
  },
});
