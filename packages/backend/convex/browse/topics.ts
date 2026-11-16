import { v } from "convex/values";
import { query } from "../_generated/server";
import { topicTitle } from "../ai/paths/catalog";
import { thumbUrlFor, topicTracks } from "../browse";
import { requireAuth } from "../lib/auth";

/**
 * Explore's topic page (redesign B5, explore-doors §4 and §13). The older
 * Browse reads stay in the flat `browse.ts`; new topic reads live here.
 */

export const topicHeaderValidator = v.object({
	/** Music tracks listed here, its secondary-topic tracks included (getTopic's rows). */
	musicCount: v.number(),
	slug: v.string(),
	/** Spoken tracks: singles and series episodes. */
	supportCount: v.number(),
	thumbhash: v.optional(v.string()),
	thumbUrl: v.string(),
	title: v.string(),
});

/**
 * The topic page's cover: title, cover art and its ThumbHash, and the count
 * line ("12 spoken · 8 music"). Same fields and rules as the topic's
 * `getTopics` tile: the `topics` row's curated title and cover, else the
 * slug-derived title and the first active track's art.
 *
 * Counts come from `topicTracks`, the same three indexed reads of this
 * topic's rows that `getTopic` lists, so the cover always matches the rows.
 * No maintained count exists and none is needed: a topic holds a few dozen
 * tracks at most, and there is no table scan.
 *
 * `null` when the topic has no active track (unknown slug, or every track
 * retired): the grid doesn't show it either, and `getTopic` returns no rows.
 * A `topics` row alone doesn't publish a topic.
 */
export const getTopicHeader = query({
	args: { slug: v.string() },
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const tracks = await topicTracks(ctx, args.slug);
		const first = tracks[0];
		if (!first) {
			return null;
		}
		const row = await ctx.db
			.query("topics")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.first();
		const cover = row ?? first;
		const supportCount = tracks.filter((t) => t.family === "support").length;
		return {
			musicCount: tracks.length - supportCount,
			slug: args.slug,
			supportCount,
			thumbhash: cover.thumbhash,
			thumbUrl: await thumbUrlFor(cover.thumbKey),
			title: row?.title || topicTitle(args.slug),
		};
	},
	returns: v.union(topicHeaderValidator, v.null()),
});
