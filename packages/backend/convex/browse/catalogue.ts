import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { r2 } from "../ai/paths/audioTracks";
import { topicSlug, topicTitle } from "../ai/paths/catalog";

/**
 * The catalogue reads Browse, Library and Explore share: a track as a list
 * row, thumbnail URLs, topic titles and which tracks belong to a topic. No
 * public functions here; the reads live in `hub.ts`, `family.ts` and
 * `topics.ts`.
 */

/**
 * Thumbnails are public catalogue art, so sign for the R2 maximum (7 days)
 * rather than the 900s default — a mounted browse view would otherwise show
 * broken images after 15 minutes without a data change to re-run the query.
 * A relaunch or any catalogue write re-signs well inside the window.
 */
const THUMB_URL_TTL_SEC = 604_800;
export const thumbUrlFor = (thumbKey: string) =>
	r2.getUrl(thumbKey, { expiresIn: THUMB_URL_TTL_SEC });

export function attributionFor(track: {
	family: "support" | "music";
	narrators?: string[];
	licence?: { attributionRequired: boolean; attributionText: string };
}) {
	if (track.family === "music") {
		return track.licence?.attributionRequired
			? track.licence.attributionText
			: undefined;
	}
	return track.narrators && track.narrators.length > 0
		? track.narrators.join(", ")
		: undefined;
}

export const familyValidator = v.union(
	v.literal("support"),
	v.literal("music")
);

export const trackItemValidator = v.object({
	_id: v.id("audio_tracks"),
	attribution: v.optional(v.string()),
	durationSec: v.number(),
	episodeNumber: v.optional(v.number()),
	family: familyValidator,
	series: v.optional(v.string()),
	seriesTitle: v.optional(v.string()),
	slug: v.string(),
	thumbhash: v.optional(v.string()),
	thumbUrl: v.string(),
	title: v.string(),
	// The track's own (primary) topic's display title, for rows that show which
	// topic a track belongs to (B5). Optional: added after shipped builds.
	topicTitle: v.optional(v.string()),
});

/**
 * Display titles of shared topics, one indexed `topics` read per distinct
 * slug per call: a page of 30 tracks spans a handful of topics, so a list
 * never reads a row per track. The curated title, else the slug-derived one
 * (the grid's rule). Takes a track's `topic` or a bare shared slug.
 */
export function topicTitles(ctx: QueryCtx) {
	const bySlug = new Map<string, Promise<string>>();
	return (topic: string) => {
		const slug = topicSlug(topic);
		let title = bySlug.get(slug);
		if (!title) {
			title = ctx.db
				.query("topics")
				.withIndex("by_slug", (q) => q.eq("slug", slug))
				.first()
				.then((row) => row?.title || topicTitle(slug));
			bySlug.set(slug, title);
		}
		return title;
	};
}

/**
 * Turns `audio_tracks` rows into track items. Make one per query call and map
 * every row through it, so the rows share one `topicTitles` cache.
 */
export function trackItems(ctx: QueryCtx) {
	const titleOf = topicTitles(ctx);
	return async (t: Doc<"audio_tracks">) => ({
		_id: t._id,
		attribution: attributionFor(t),
		durationSec: t.durationSec,
		episodeNumber: t.episodeNumber,
		family: t.family,
		series: t.series,
		seriesTitle: t.seriesTitle,
		slug: t.slug,
		thumbhash: t.thumbhash,
		thumbUrl: await thumbUrlFor(t.thumbKey),
		title: t.title,
		topicTitle: await titleOf(t.topic),
	});
}

async function activeByFamily(
	ctx: QueryCtx,
	family: Doc<"audio_tracks">["family"]
) {
	// Bounded catalogue (docs/paths-v1.md decision 18) — a few hundred rows at most.
	return await ctx.db
		.query("audio_tracks")
		.withIndex("by_family_and_active", (q) =>
			q.eq("family", family).eq("active", true)
		)
		.take(1000);
}

/**
 * Every shared topic with ≥ 1 active track in either family, slug order. A
 * `topics` row (#353) decorates a tile — cover + curated title — but never
 * adds one: membership is the active-track grouping. Shared by the topic grid
 * and Browse search (#550).
 */
export async function activeTopics(ctx: QueryCtx) {
	const tracks = [
		...(await activeByFamily(ctx, "support")),
		...(await activeByFamily(ctx, "music")),
	];

	const byTopic = new Map<
		string,
		{
			thumbKey: string;
			thumbhash?: string;
			supportCount: number;
			musicCount: number;
		}
	>();
	for (const t of tracks) {
		const slug = topicSlug(t.topic);
		const entry = byTopic.get(slug) ?? {
			musicCount: 0,
			supportCount: 0,
			thumbhash: t.thumbhash,
			thumbKey: t.thumbKey,
		};
		if (t.family === "support") {
			entry.supportCount += 1;
		} else {
			entry.musicCount += 1;
		}
		byTopic.set(slug, entry);
	}
	// A music track also lists under its secondary topic (getTopic), so it counts
	// there too, and its cover stands in when the topic has no track of its own.
	for (const t of tracks) {
		if (!t.secondaryTopic) {
			continue;
		}
		const slug = topicSlug(t.secondaryTopic);
		const entry = byTopic.get(slug) ?? {
			musicCount: 0,
			supportCount: 0,
			thumbhash: t.thumbhash,
			thumbKey: t.thumbKey,
		};
		entry.musicCount += 1;
		byTopic.set(slug, entry);
	}

	const rows = new Map(
		(await ctx.db.query("topics").take(1000)).map((r) => [r.slug, r])
	);
	return [...byTopic.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([slug, entry]) => {
			const row = rows.get(slug);
			return {
				...entry,
				slug,
				title: row?.title || topicTitle(slug),
				...(row && { thumbhash: row.thumbhash, thumbKey: row.thumbKey }),
			};
		});
}

/**
 * One shared topic's active tracks, in the topic screen's order: support,
 * then music, then music listed here as its secondary topic. Three indexed
 * reads of this topic's rows only (bounded catalogue, decision 18). The topic
 * screen and its header (`topics.getTopicHeader`) both read through here, so
 * the header's counts always match the rows.
 */
export async function topicTracks(ctx: QueryCtx, slug: string) {
	const musicTopic = `music_topic_${slug}`;
	const [support, music, alsoMusic] = await Promise.all([
		ctx.db
			.query("audio_tracks")
			.withIndex("by_family_and_topic", (q) =>
				q.eq("family", "support").eq("topic", `audio_topic_${slug}`)
			)
			.take(1000),
		ctx.db
			.query("audio_tracks")
			.withIndex("by_family_and_topic", (q) =>
				q.eq("family", "music").eq("topic", musicTopic)
			)
			.take(1000),
		// Tracks whose secondary topic this is list after the topic's own.
		ctx.db
			.query("audio_tracks")
			.withIndex("by_family_and_secondaryTopic", (q) =>
				q.eq("family", "music").eq("secondaryTopic", musicTopic)
			)
			.take(1000),
	]);
	return [...support, ...music, ...alsoMusic].filter((t) => t.active);
}
