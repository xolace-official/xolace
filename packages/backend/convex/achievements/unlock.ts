import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { badgeArt, badgeArtValidator } from "./art";
import { type Achievement, findAchievement } from "./catalog";

/**
 * The in-app unlock moment (#693): live badges the user hasn't been shown,
 * and the stamp that keeps them from showing again. Backfill rows are never
 * listed; they were earned before the user could have seen a moment. Nor are
 * badges left unseen too long (`foldUnseen`): a store build from before badges
 * never opens the moment, and a run of them on update would replay weeks.
 */

/** More than ever land at once; the rest wait for the next moment. */
const UNSEEN_LIMIT = 10;
/** markSeen takes what one moment showed, so this is generous. */
const MARK_LIMIT = 50;

export const unseen = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const rows: { achievement: Achievement; row: Doc<"user_achievements"> }[] =
			[];
		// Not take(): a row the catalog no longer knows can't use up a slot, since
		// it's never shown and so never stamped.
		for await (const row of ctx.db
			.query("user_achievements")
			.withIndex(
				"by_emotionalProfileId_and_source_and_seenAt_and_pushedAt",
				(q) =>
					q
						.eq("emotionalProfileId", profile._id)
						.eq("source", "live")
						.eq("seenAt", undefined)
			)) {
			const achievement = findAchievement(row.achievementId);
			if (achievement) {
				rows.push({ achievement, row });
			}
			if (rows.length === UNSEEN_LIMIT) {
				break;
			}
		}
		// Index order within a seenAt is creation order; earnedAt is what the user lived.
		rows.sort((a, b) => a.row.earnedAt - b.row.earnedAt);
		return await Promise.all(
			rows.map(async ({ achievement, row }) => ({
				achievementId: row.achievementId,
				art: await badgeArt(ctx, achievement.artKey),
				copy: achievement.copy,
				id: row._id,
				// What it awarded at the time, not today's catalog value.
				sparks: row.sparks,
				title: achievement.title,
			}))
		);
	},
	returns: v.array(
		v.object({
			achievementId: v.string(),
			art: badgeArtValidator,
			copy: v.string(),
			id: v.id("user_achievements"),
			sparks: v.number(),
			title: v.string(),
		})
	),
});

/** Stamps what the moment showed. Ids that aren't the caller's, or already seen, are skipped. */
export const markSeen = mutation({
	args: { ids: v.array(v.id("user_achievements")) },
	handler: async (ctx, { ids }) => {
		const { profile } = await requireAuth(ctx);
		const now = Date.now();
		for (const id of ids.slice(0, MARK_LIMIT)) {
			const row = await ctx.db.get("user_achievements", id);
			if (row?.emotionalProfileId === profile._id && row.seenAt === undefined) {
				await ctx.db.patch("user_achievements", id, { seenAt: now });
			}
		}
		return null;
	},
	returns: v.null(),
});

/**
 * A week on from a live award: if the moment never showed it, it moves to the
 * quiet side, so the summary (firstSight.ts) counts it instead. A scheduled
 * write, because a query can't watch the clock. `source` is what routes a row,
 * which is why an award before the backfill is written quietly too (award.ts).
 */
export const foldUnseen = internalMutation({
	args: {
		achievementId: v.string(),
		emotionalProfileId: v.id("emotional_profiles"),
	},
	handler: async (ctx, { achievementId, emotionalProfileId }) => {
		const row = await ctx.db
			.query("user_achievements")
			.withIndex("by_emotionalProfileId_and_achievementId", (q) =>
				q
					.eq("emotionalProfileId", emotionalProfileId)
					.eq("achievementId", achievementId)
			)
			.unique();
		if (row?.source === "live" && row.seenAt === undefined) {
			await ctx.db.patch("user_achievements", row._id, { source: "backfill" });
		}
		return null;
	},
	returns: v.null(),
});
