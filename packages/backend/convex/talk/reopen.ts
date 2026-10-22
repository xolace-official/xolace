import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { requireSessionOwnership } from "../lib/auth";
import { requirePremium } from "../lib/premium";
import { talkGreeting, talkSetup } from "./companion";
import { renderEarlier } from "./memory";
import { reserveTalk } from "./openings";
import { talkPreload } from "./remember";
import { limitTalkStart, MAX_TALK_LINES, TALK_IDLE_MS } from "./session";

/**
 * "Say more" on a talk's mirror (#604): the same talk opens again for up to
 * 5 more minutes, limited by what's left of the week. It's a new ElevenLabs
 * conversation, so it gets its own key, clock and reservation; its lines
 * continue the session's `talk_turns` from `talkFromSeq`. The companion
 * hears the earlier thread in its cached prefix, fixed for the reopening.
 * Closing it remakes the mirror through the pipeline (finalizeTalk).
 */
export const start = internalMutation({
	args: {
		secret: v.string(),
		sessionId: v.id("sessions"),
		startedAt: v.number(),
	},
	handler: async (ctx, { sessionId, startedAt, secret }) => {
		const { profile, session } = await requireSessionOwnership(ctx, sessionId);
		await requirePremium(ctx, profile, "talk");
		// From its mirror only: before it the talk is still open, past it the mirror is kept.
		if (session.entryType !== "talk" || session.state !== "mirror_delivered") {
			throw new ConvexError({ code: "not_reopenable" });
		}
		await limitTalkStart(ctx, profile._id);
		// Throws `talk_time_used` under the minimum.
		const { ceilingS, talkKey } = await reserveTalk(
			ctx,
			profile._id,
			sessionId,
			{
				reopen: true,
				secret,
				startedAt,
			}
		);
		const lines = await ctx.db
			.query("talk_turns")
			.withIndex("by_session_and_seq", (q) => q.eq("sessionId", sessionId))
			.take(MAX_TALK_LINES);
		const now = Date.now();
		const { talkMemory, recall } = await talkPreload(
			ctx,
			profile,
			now,
			sessionId
		);
		const setup = await talkSetup(ctx, profile._id);
		await ctx.db.patch("sessions", sessionId, {
			state: "initiated",
			talkFromSeq: (lines.at(-1)?.seq ?? -1) + 1,
			talkKey,
			...setup.session,
			// Still the talk it was with, even if the space was renamed since.
			...(session.companionName
				? { companionName: session.companionName }
				: {}),
			// Their name was asked in the talk itself, answered or not.
			askPersonName: false,
			talkMemory: [talkMemory, renderEarlier(lines)].join("\n\n"),
			...(recall ? { talkRecall: { lines: [], surfaced: [] } } : {}),
			updatedAt: now,
		});
		await ctx.scheduler.runAfter(
			TALK_IDLE_MS,
			internal.talk.session.finalizeIfIdle,
			{ sessionId, talkKey }
		);
		return {
			ceilingS,
			firstMessage: talkGreeting(
				session.companionName ?? setup.session.companionName,
				true
			),
			sessionId,
			speed: setup.speed,
			talkKey,
			voiceId: setup.voiceId,
		};
	},
	returns: v.object({
		ceilingS: v.number(),
		firstMessage: v.string(),
		sessionId: v.id("sessions"),
		speed: v.number(),
		talkKey: v.string(),
		voiceId: v.string(),
	}),
});
