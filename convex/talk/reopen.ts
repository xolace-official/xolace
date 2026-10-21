import { ConvexError, v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireSessionOwnership } from "../lib/auth";
import { requirePremium } from "../lib/premium";
import { reserveTalk } from "./time";
import { talkPreload } from "./remember";
import { talkSetup } from "./companion";
import { renderEarlier } from "./memory";
import { MAX_TALK_LINES, TALK_IDLE_MS } from "./session";

/**
 * "Say more" on a talk's mirror (#604): the same talk opens again for up to
 * 5 more minutes, limited by what's left of the week. It's a new ElevenLabs
 * conversation, so it gets its own key, clock and reservation; its lines
 * continue the session's `talk_turns` from `talkFromSeq`. The companion
 * hears the earlier thread in its cached prefix, fixed for the reopening.
 * Closing it remakes the mirror through the pipeline (finalizeTalk).
 */
export const start = internalMutation({
  args: { sessionId: v.id("sessions"), startedAt: v.number(), secret: v.string() },
  returns: v.object({
    sessionId: v.id("sessions"),
    talkKey: v.string(),
    ceilingS: v.number(),
    voiceId: v.string(),
    speed: v.number(),
  }),
  handler: async (ctx, { sessionId, startedAt, secret }) => {
    const { profile, session } = await requireSessionOwnership(ctx, sessionId);
    await requirePremium(ctx, profile, "talk");
    // From its mirror only: before it the talk is still open, past it the mirror is kept.
    if (session.entryType !== "talk" || session.state !== "mirror_delivered") {
      throw new ConvexError({ code: "not_reopenable" });
    }
    // Throws `talk_time_used` under the minimum.
    const { ceilingS, talkKey } = await reserveTalk(ctx, profile._id, sessionId, {
      startedAt,
      secret,
      reopen: true,
    });
    const lines = await ctx.db
      .query("talk_turns")
      .withIndex("by_session_and_seq", (q) => q.eq("sessionId", sessionId))
      .take(MAX_TALK_LINES);
    const now = Date.now();
    const { talkMemory, recall } = await talkPreload(ctx, profile, now);
    const setup = await talkSetup(ctx, profile._id);
    await ctx.db.patch("sessions", sessionId, {
      state: "initiated",
      talkKey,
      talkFromSeq: (lines.at(-1)?.seq ?? -1) + 1,
      ...setup.session,
      // Still the talk it was with, even if the space was renamed since.
      ...(session.companionName ? { companionName: session.companionName } : {}),
      // Their name was asked in the talk itself, answered or not.
      askPersonName: false,
      talkMemory: [talkMemory, renderEarlier(lines)].join("\n\n"),
      ...(recall ? { talkRecall: { lines: [], surfaced: [] } } : {}),
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(TALK_IDLE_MS, internal.talk.session.finalizeIfIdle, { sessionId, talkKey });
    return { sessionId, talkKey, ceilingS, voiceId: setup.voiceId, speed: setup.speed };
  },
});
