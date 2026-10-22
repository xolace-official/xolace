import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../../_generated/server";
import { renderSemanticProfile } from "../../semanticProfiles";

// =============================================================
// Reflection Agent — READ TOOL backing queries (Cognition Layer Phase 3).
//
// Bounded internalQueries the consolidation loop reaches through
// `dispatchTool`. All are read-only and `.take(n)`-capped per the query
// guidelines — the agent never scans a table unbounded. Returns are plain
// serializable shapes; the dispatcher JSON-stringifies them into tool_result.
// =============================================================

const TIMELINE_LIMIT = 40;
const SESSIONS_LIMIT = 20;
const MOOD_LIMIT = 30;
const STATS_LIMIT = 40;

/** Emotion + intensity over time — the raw material for pattern detection. */
export const getEmotionTimeline = internalQuery({
	args: { emotionalProfileId: v.id("emotional_profiles") },
	handler: async (ctx, args) => {
		const rows = await ctx.db
			.query("emotional_metadata")
			.withIndex("by_profile_theme", (q) =>
				q.eq("emotionalProfileId", args.emotionalProfileId)
			)
			.order("desc")
			.take(TIMELINE_LIMIT);
		return rows.map((m) => ({
			createdAt: m.createdAt,
			granularLabel: m.granularLabel ?? null,
			intensity: m.intensity,
			primaryEmotion: m.primaryEmotion,
			temporalContext: m.temporalContext ?? null,
			thematicTags: m.thematicTags,
			userLanguageTags: m.userLanguageTags,
		}));
	},
});

/**
 * Recent sessions — shape, path, how the mirror landed, and the later
 * follow-up check-in (#453): the chip answer plus the structured response.
 * Read-only; the check-in never writes understanding directly.
 */
export const getRecentSessions = internalQuery({
	args: { emotionalProfileId: v.id("emotional_profiles") },
	handler: async (ctx, args) => {
		const rows = await ctx.db
			.query("sessions")
			.withIndex("by_profile_time", (q) =>
				q.eq("emotionalProfileId", args.emotionalProfileId)
			)
			.order("desc")
			.take(SESSIONS_LIMIT);
		return Promise.all(
			rows.map(async (s) => ({
				confirmationState: s.confirmationState ?? null,
				createdAt: s.createdAt,
				entryType: s.entryType,
				followUp: await readFollowUp(ctx, s._id),
				mirrorText: s.mirrorText ?? null,
				pathChosen: s.pathChosen ?? null,
				postSessionMood: s.postSessionMood ?? null,
				state: s.state,
			}))
		);
	},
});

/** A session's answered check-in, or null if it never got one. */
export async function readFollowUp(ctx: QueryCtx, sessionId: Id<"sessions">) {
	// One card per session in production; dev resets can add more, so take the
	// newest one the user actually answered.
	const cards = await ctx.db
		.query("follow_up_cards")
		.withIndex("by_session", (q) => q.eq("sessionId", sessionId))
		.order("desc")
		.take(5);
	const card = cards.find((c) => c.userResponse);
	if (!card?.userResponse) {
		return null;
	}
	const response = await ctx.db
		.query("follow_up_responses")
		.withIndex("by_card", (q) => q.eq("cardId", card._id))
		.first();
	return {
		answer: card.userResponse,
		heavierChoice: response?.heavierChoice ?? null,
		whatHelped: response?.reflectionText ?? null,
	};
}

/** Post-session mood signal over recent sessions (lighter/same/heavier). */
export const getMoodDeltas = internalQuery({
	args: { emotionalProfileId: v.id("emotional_profiles") },
	handler: async (ctx, args) => {
		const rows = await ctx.db
			.query("sessions")
			.withIndex("by_profile_time", (q) =>
				q.eq("emotionalProfileId", args.emotionalProfileId)
			)
			.order("desc")
			.take(MOOD_LIMIT);
		return rows
			.filter((s) => s.postSessionMood !== undefined)
			.map((s) => ({
				createdAt: s.createdAt,
				postSessionMood: s.postSessionMood,
			}));
	},
});

/** Aggregate "what lands": confirmation outcomes + tone tallies. */
export const getConfirmationStats = internalQuery({
	args: { emotionalProfileId: v.id("emotional_profiles") },
	handler: async (ctx, args) => {
		const rows = await ctx.db
			.query("sessions")
			.withIndex("by_profile_time", (q) =>
				q.eq("emotionalProfileId", args.emotionalProfileId)
			)
			.order("desc")
			.take(STATS_LIMIT);

		const confirmation: Record<string, number> = {};
		const tone: Record<string, number> = {};
		for (const s of rows) {
			if (s.confirmationState) {
				confirmation[s.confirmationState] =
					(confirmation[s.confirmationState] ?? 0) + 1;
			}
			if (s.toneUsed) {
				tone[s.toneUsed] = (tone[s.toneUsed] ?? 0) + 1;
			}
		}
		return { confirmation, sampleSize: rows.length, tone };
	},
});

/** The current narrative profile, rendered whole (never vector-searched). */
export const readSemanticProfile = internalQuery({
	args: { emotionalProfileId: v.id("emotional_profiles") },
	handler: async (ctx, args) => {
		const profile = await ctx.db.get(
			"emotional_profiles",
			args.emotionalProfileId
		);
		if (!profile?.currentSemanticProfileId) {
			return {
				rendered: null as string | null,
				version: null as number | null,
			};
		}
		const doc = await ctx.db.get(
			"semantic_profiles",
			profile.currentSemanticProfileId
		);
		if (!doc) {
			return {
				rendered: null as string | null,
				version: null as number | null,
			};
		}
		return { rendered: renderSemanticProfile(doc), version: doc.version };
	},
});
