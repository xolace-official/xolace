import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { badgeArt, badgeArtValidator } from "./art";
import { findAchievement } from "./catalog";

/**
 * First sight of the backfill (#686, #701): one quiet summary of what the user
 * had already earned, shown once on the first open after it lands. Its own
 * route, never the one-at-a-time unlock moment. Dismissing it stamps every row
 * it counted seen; a row backfilled later (a new catalog entry) brings it back.
 */

/** Far above any backfill: every rung of a long streak plus every one-off. */
const SUMMARY_LIMIT = 200;
/** "A few thumbnails." */
const THUMBNAIL_COUNT = 4;

export const summary = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const rows = await ctx.db
			.query("user_achievements")
			.withIndex(
				"by_emotionalProfileId_and_source_and_seenAt_and_pushedAt",
				(q) =>
					q
						.eq("emotionalProfileId", profile._id)
						.eq("source", "backfill")
						.eq("seenAt", undefined)
			)
			.take(SUMMARY_LIMIT);
		if (rows.length === 0) {
			return null;
		}

		// The biggest first, one per image: open-ended streak rungs share art.
		const ranked = [...rows].sort(
			(a, b) => b.sparks - a.sparks || b.earnedAt - a.earnedAt
		);
		const artKeys = new Set<string>();
		const picked: { achievementId: string; artKey: string; title: string }[] =
			[];
		for (const row of ranked) {
			const achievement = findAchievement(row.achievementId);
			if (achievement && !artKeys.has(achievement.artKey)) {
				artKeys.add(achievement.artKey);
				picked.push({
					achievementId: row.achievementId,
					artKey: achievement.artKey,
					title: achievement.title,
				});
			}
			if (picked.length === THUMBNAIL_COUNT) {
				break;
			}
		}

		return {
			badges: rows.length,
			ids: rows.map((row) => row._id),
			// What they awarded at the time, not today's catalog values.
			sparks: rows.reduce((sum, row) => sum + row.sparks, 0),
			thumbnails: await Promise.all(
				picked.map(async ({ achievementId, artKey, title }) => ({
					achievementId,
					art: await badgeArt(ctx, artKey),
					title,
				}))
			),
		};
	},
	returns: v.union(
		v.null(),
		v.object({
			badges: v.number(),
			ids: v.array(v.id("user_achievements")),
			sparks: v.number(),
			thumbnails: v.array(
				v.object({
					achievementId: v.string(),
					art: badgeArtValidator,
					title: v.string(),
				})
			),
		})
	),
});

/**
 * Stamps what the summary counted. Ids that aren't the caller's backfill rows,
 * or are already seen, are skipped.
 */
export const markSeen = mutation({
	args: { ids: v.array(v.id("user_achievements")) },
	handler: async (ctx, { ids }) => {
		const { profile } = await requireAuth(ctx);
		const now = Date.now();
		for (const id of ids.slice(0, SUMMARY_LIMIT)) {
			const row = await ctx.db.get("user_achievements", id);
			if (
				row?.emotionalProfileId === profile._id &&
				row.source === "backfill" &&
				row.seenAt === undefined
			) {
				await ctx.db.patch("user_achievements", id, { seenAt: now });
			}
		}
		return null;
	},
	returns: v.null(),
});
