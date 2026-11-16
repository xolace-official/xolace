import { type ObjectType, v } from "convex/values";
import { type QueryCtx, query } from "../_generated/server";
import { topicTitle } from "../ai/paths/catalog";
import { requireAuth } from "../lib/auth";
import {
	activeTopics,
	thumbUrlFor,
	topicTracks,
	trackItems,
	trackItemValidator,
} from "./catalogue";

/**
 * Topic reads: the topic grid (#339), one topic's tracks, and the topic
 * page's header (redesign B5, explore-doors §4 and §13).
 */

export const topicTileValidator = v.object({
	musicCount: v.number(),
	slug: v.string(),
	supportCount: v.number(),
	thumbhash: v.optional(v.string()),
	thumbUrl: v.string(),
	title: v.string(),
});

/** Topic grid — one tile per shared topic with ≥ 1 active track in either family. */
export async function getTopicsCore(ctx: QueryCtx) {
	await requireAuth(ctx);
	return await Promise.all(
		(await activeTopics(ctx)).map(async ({ thumbKey, ...t }) => ({
			...t,
			thumbUrl: await thumbUrlFor(thumbKey),
		}))
	);
}

export const getTopics = query({
	args: {},
	handler: getTopicsCore,
	returns: v.array(topicTileValidator),
});

export const topicSlugArgs = { slug: v.string() };

/**
 * Topic screen header: the curated `topics` title (#353), else the slug-derived one the grid uses.
 * Always returns a title, even for an unknown slug. Registered only at the
 * old flat path (`browse:getTopicTitle`), for the topic screen and shipped
 * builds: S8 moves the screen to `getTopicHeader`, which also returns the
 * cover and counts and is `null` for an unpublished topic.
 */
export async function getTopicTitleCore(
	ctx: QueryCtx,
	args: ObjectType<typeof topicSlugArgs>
) {
	await requireAuth(ctx);
	const row = await ctx.db
		.query("topics")
		.withIndex("by_slug", (q) => q.eq("slug", args.slug))
		.unique();
	return row?.title || topicTitle(args.slug);
}

/** Topic screen — both families' active tracks for one shared topic slug. */
export async function getTopicCore(
	ctx: QueryCtx,
	args: ObjectType<typeof topicSlugArgs>
) {
	await requireAuth(ctx);
	return await Promise.all(
		(await topicTracks(ctx, args.slug)).map(trackItems(ctx))
	);
}

export const getTopic = query({
	args: topicSlugArgs,
	handler: getTopicCore,
	returns: v.array(trackItemValidator),
});

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
	args: topicSlugArgs,
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
