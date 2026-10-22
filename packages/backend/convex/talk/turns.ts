import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, query } from "../_generated/server";
import { stripAudioTags } from "../ai/talk/audioTags";
import { requireSessionOwnership } from "../lib/auth";
import { talkPeakValidator } from "../lib/validators";
import { recallQuery } from "./remember";
import { raiseTalkSafety } from "./safety";
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
		// The companion serving this turn (#606), stamped on the talk.
		companionVersion: v.optional(v.string()),
		lines: v.optional(v.array(talkLineValidator)),
		// A phrase-check crisis (#599), known as the turn starts: here so help
		// is on screen before the crisis line is said.
		peak: v.optional(talkPeakValidator),
		reply: v.optional(v.object({ seq: v.number(), text: v.string() })),
		sessionId: v.string(),
		talkKey: v.string(),
	},
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
		// ElevenLabs resends the companion's lines as the model wrote them, audio
		// tags and all; the thread under the mirror shows them, so they go.
		const lines = args.lines?.map((l) =>
			l.role === "companion" ? { ...l, text: stripAudioTags(l.text) } : l
		);
		const from = session.talkFromSeq ?? 0;

		if (lines) {
			let changed = false;
			for (const row of recent) {
				const resent = row.seq >= from ? lines[row.seq - from] : undefined;
				if (
					resent &&
					(row.provisional ||
						resent.text !== row.text ||
						resent.role !== row.role)
				) {
					await ctx.db.patch("talk_turns", row._id, {
						...resent,
						provisional: undefined,
					});
					changed = true;
				}
			}
			for (let seq = stored; seq < from + lines.length; seq++) {
				await ctx.db.insert("talk_turns", {
					seq,
					sessionId: session._id,
					...lines[seq - from],
				});
				changed = true;
			}
			// The person said something new: recall in the background for the next turn (#598).
			const query = changed && session.talkRecall ? recallQuery(lines) : null;
			if (query) {
				await ctx.scheduler.runAfter(0, internal.talk.remember.recall, {
					query,
					sessionId: session._id,
				});
			}
		}
		if (args.peak) {
			await raiseTalkSafety(ctx, session, args.peak);
		}

		const reply = args.reply && {
			seq: from + args.reply.seq,
			text: args.reply.text.trim(),
		};
		if (reply?.text) {
			const at = recent.find((r) => r.seq === reply.seq);
			// A later turn's resend already holds this position: it wins.
			if (at?.provisional) {
				await ctx.db.patch("talk_turns", at._id, { text: reply.text });
			} else if (!at && reply.seq === stored) {
				await ctx.db.insert("talk_turns", {
					provisional: true,
					role: "companion",
					seq: reply.seq,
					sessionId: session._id,
					text: reply.text,
				});
			}
		}

		// Only a resend is activity: the reply-only call lands seconds after it.
		// The idle check scheduled at talk start reads this and reschedules itself.
		if (args.lines) {
			await ctx.db.patch("sessions", session._id, {
				updatedAt: Date.now(),
				...(args.companionVersion
					? { talkCompanionVersion: args.companionVersion }
					: {}),
			});
		}
		return true;
	},
	returns: v.boolean(),
});

/**
 * A talk's thread, read-only: under its mirror on the timeline, and as the
 * talk screen opens again on "Say more" (#604).
 */
export const thread = query({
	args: { sessionId: v.id("sessions") },
	handler: async (ctx, { sessionId }) => {
		const { session } = await requireSessionOwnership(ctx, sessionId);
		if (session.entryType !== "talk") {
			return [];
		}
		const lines = await ctx.db
			.query("talk_turns")
			.withIndex("by_session_and_seq", (q) => q.eq("sessionId", sessionId))
			.take(MAX_TALK_LINES);
		return lines.map(({ role, text }) => ({ role, text }));
	},
	returns: v.array(talkLineValidator),
});
