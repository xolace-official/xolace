import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

/**
 * What the xolacer meaning index embeds (#570): bio and specialties, or null
 * when they must not be suggested at all (paused, unpublished, deleted) so the
 * index job removes them. The embed lives in `ai/xolacers/embed.ts`.
 */
export const textForIndex = internalQuery({
	args: { emotionalProfileId: v.id("emotional_profiles") },
	handler: async (ctx, { emotionalProfileId }) => {
		const xolacer = await ctx.db
			.query("xolacer_profiles")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", emotionalProfileId)
			)
			.unique();
		if (!(xolacer?.complete && xolacer.active && xolacer.bio)) {
			return null;
		}
		return [
			xolacer.bio,
			`Listens to: ${(xolacer.specialties ?? []).join(", ")}`,
		].join("\n");
	},
	returns: v.union(v.string(), v.null()),
});

/**
 * Every xolacer row, for the index backfill.
 * ponytail: rows past 1000 are silently skipped; page it if the roster (a
 * curated set, single digits today) ever gets near.
 */
export const profileIdsForIndex = internalQuery({
	args: {},
	handler: async (ctx) => {
		const rows = await ctx.db.query("xolacer_profiles").take(1000);
		return rows.map((r) => r.emotionalProfileId);
	},
	returns: v.array(v.id("emotional_profiles")),
});
