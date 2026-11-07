import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { recordActivity } from "../streaks/activityLog";

/**
 * One play of a track, logged as a `listen` (#697): it counts toward the
 * streak and days showed up, and the first earns First listen. Trusted from
 * the client, which calls it once per play when the play crosses 60 s, or at
 * the end of a shorter track. A track gone from the catalogue logs nothing.
 */
export const recordListen = mutation({
	args: { trackId: v.id("audio_tracks") },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const track = await ctx.db.get("audio_tracks", args.trackId);
		if (!track) {
			return null;
		}
		await recordActivity(ctx, {
			actionType: "listen",
			emotionalProfileId: profile._id,
		});
		return null;
	},
	returns: v.null(),
});
