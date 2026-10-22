import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
	internalAction,
	internalMutation,
	internalQuery,
	type QueryCtx,
} from "../_generated/server";
import { searchEpisodicMemory } from "../ai/helpers/episodicSearch";
import { shapeIntakeSignals } from "../ai/intakeSignals";
import { COMPANION_FALLBACK_NAME } from "../ai/prompts/companion";
import { talkPeakValidator } from "../lib/validators";
import { talkDirectnessValidator } from "../lib/voices";
import { renderSemanticProfile } from "../semanticProfiles";
import { recentUnderstandings } from "../understanding";
import { recallLine, renderMemory, renderRecall } from "./memory";

// Read at talk start: the companion's preload (#598, #580).
const RECENT_MOMENTS = 5;
// Each turn's recall: the person's last lines, the top hits.
const RECALL_LINES = 2;
// Far past the hits a 15-min talk can surface.
const MAX_SURFACED = 300;

const memoryOn = async (ctx: QueryCtx, profileId: Id<"emotional_profiles">) =>
	(
		await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profileId))
			.unique()
	)?.personalMemoryEnabled !== false;

const MEMORY_OFF_TEXT = renderMemory(
	{ intake: null, memoryOn: false, moments: [], profile: null },
	0
);

/**
 * The talk's preload, plus whether recall runs. Memory off reads nothing of
 * the person; steadiness and insights are never read. A reopening passes its
 * own session as `exclude`: its first half is the thread, not a past moment.
 */
export async function talkPreload(
	ctx: QueryCtx,
	profile: Doc<"emotional_profiles">,
	now: number,
	exclude?: Id<"sessions">
): Promise<{ talkMemory: string; recall: boolean }> {
	if (!(await memoryOn(ctx, profile._id))) {
		return { recall: false, talkMemory: MEMORY_OFF_TEXT };
	}
	const semantic = profile.currentSemanticProfileId
		? await ctx.db.get("semantic_profiles", profile.currentSemanticProfileId)
		: null;
	const moments = [];
	const recent = await recentUnderstandings(
		ctx,
		profile._id,
		RECENT_MOMENTS + 1
	);
	for (const u of recent
		.filter((r) => r.sessionId !== exclude)
		.slice(0, RECENT_MOMENTS)) {
		const session = await ctx.db.get("sessions", u.sessionId);
		moments.push({ ...u, entryType: session?.entryType ?? "open_prompt" });
	}
	// First-timers only, as in buildSessionContext (ADR-0014).
	const intake =
		profile.sessionCount === 0
			? shapeIntakeSignals(
					await ctx.db
						.query("intake_responses")
						.withIndex("by_profile", (q) =>
							q.eq("emotionalProfileId", profile._id)
						)
						.unique()
				)
			: null;
	return {
		recall: true,
		talkMemory: renderMemory(
			{
				intake,
				memoryOn: true,
				moments,
				profile: semantic ? renderSemanticProfile(semantic) : null,
			},
			now
		),
	};
}

/** The recall query: the person's last lines, when the talk ends on one. */
export function recallQuery(
	lines: { role: string; text: string }[]
): string | null {
	if (lines.at(-1)?.role !== "person") {
		return null;
	}
	return lines
		.filter((l) => l.role === "person")
		.slice(-RECALL_LINES)
		.map((l) => l.text)
		.join("\n");
}

/**
 * The endpoint's per-turn read: the preload (cached prefix) and the latest
 * recall (after it). `sessionId` arrives from ElevenLabs, untrusted: nothing
 * comes back without the talk's key.
 */
export const forTurn = internalQuery({
	args: { sessionId: v.string(), talkKey: v.string() },
	handler: async (ctx, args) => {
		const id = ctx.db.normalizeId("sessions", args.sessionId);
		const session = id ? await ctx.db.get("sessions", id) : null;
		if (!session?.talkKey || session.talkKey !== args.talkKey) {
			return null;
		}
		// Rechecked each turn: memory turned off mid-talk (any device) stops the past at once.
		const on = await memoryOn(ctx, session.emotionalProfileId);
		return {
			crisisLineSpoken: session.talkCrisisLineSpoken === true,
			memory: on ? (session.talkMemory ?? "") : MEMORY_OFF_TEXT,
			name: session.companionName ?? COMPANION_FALLBACK_NAME,
			person: {
				ask: session.askPersonName === true,
				name: session.personName ?? "",
			},
			recall: on ? renderRecall(session.talkRecall?.lines ?? []) : "",
			safety: session.talkSafety,
			style: {
				directness: session.talkDirectness,
				slowed: session.talkSlowed === true,
			},
		};
	},
	returns: v.union(
		v.null(),
		v.object({
			crisisLineSpoken: v.boolean(),
			memory: v.string(),
			// Who the companion is this turn (#601).
			name: v.string(),
			// What it calls the person, and whether it asks first (#602).
			person: v.object({ ask: v.boolean(), name: v.string() }),
			recall: v.string(),
			// Safety rides the same read (#599): the talk's peak, and whether the crisis line was said.
			safety: v.optional(talkPeakValidator),
			// How it speaks this talk (#603).
			style: v.object({
				directness: v.optional(talkDirectnessValidator),
				slowed: v.boolean(),
			}),
		})
	),
});

export const recallTarget = internalQuery({
	args: { sessionId: v.id("sessions") },
	handler: async (ctx, { sessionId }) => {
		const session = await ctx.db.get("sessions", sessionId);
		if (!session?.talkRecall || session.state !== "initiated") {
			return null;
		}
		if (!(await memoryOn(ctx, session.emotionalProfileId))) {
			return null;
		}
		return {
			profileId: session.emotionalProfileId,
			surfaced: session.talkRecall.surfaced,
		};
	},
	returns: v.union(
		v.null(),
		v.object({
			profileId: v.id("emotional_profiles"),
			surfaced: v.array(v.string()),
		})
	),
});

/** Scheduled by syncLines when the person speaks; its hits feed the next turn. */
export const recall = internalAction({
	args: { query: v.string(), sessionId: v.id("sessions") },
	handler: async (ctx, { sessionId, query }) => {
		const target = await ctx.runQuery(internal.talk.remember.recallTarget, {
			sessionId,
		});
		if (!target) {
			return null;
		}
		const { matches, failed } = await searchEpisodicMemory(
			ctx,
			target.profileId,
			sessionId,
			query,
			target.surfaced
		);
		// No hits clears the last ones too: a turn only hears what its own lines recalled.
		if (failed) {
			return null;
		}
		await ctx.runMutation(internal.talk.remember.storeRecall, {
			matches,
			sessionId,
		});
		return null;
	},
	returns: v.null(),
});

export const storeRecall = internalMutation({
	args: {
		matches: v.array(v.object({ key: v.string(), text: v.string() })),
		sessionId: v.id("sessions"),
	},
	handler: async (ctx, { sessionId, matches }) => {
		const session = await ctx.db.get("sessions", sessionId);
		if (!session?.talkRecall || session.state !== "initiated") {
			return null;
		}
		if (!(await memoryOn(ctx, session.emotionalProfileId))) {
			return null;
		}
		const surfaced = new Set(session.talkRecall.surfaced);
		const lines = [];
		for (const m of matches) {
			// A concurrent recall surfaced it first.
			if (surfaced.has(m.key)) {
				continue;
			}
			surfaced.add(m.key);
			const pastId = ctx.db.normalizeId("sessions", m.key);
			const past = pastId ? await ctx.db.get("sessions", pastId) : null;
			const line =
				past &&
				recallLine(
					{
						createdAt: past.createdAt,
						entryType: past.entryType,
						text: m.text,
					},
					Date.now()
				);
			if (line) {
				lines.push(line);
			}
		}
		await ctx.db.patch("sessions", sessionId, {
			talkRecall: { lines, surfaced: [...surfaced].slice(-MAX_SURFACED) },
		});
		return null;
	},
	returns: v.null(),
});
