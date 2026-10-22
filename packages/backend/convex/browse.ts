import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { type QueryCtx, query } from "./_generated/server";
import { r2 } from "./ai/paths/audioTracks";
import { topicSlug } from "./ai/paths/catalog";
import { requireAuth } from "./lib/auth";

/**
 * Browse hub reads (#338, docs/paths-v1.md §9.3). Open to every signed-in
 * user — the free-user gate is on playback (the `player` route, #340), not
 * on browsing (§9.4) — so this file never calls `requirePremium`.
 */

const shelfItemValidator = v.object({
	_id: v.id("audio_tracks"),
	attribution: v.optional(v.string()),
	family: v.union(v.literal("support"), v.literal("music")),
	slug: v.string(),
	thumbhash: v.optional(v.string()),
	thumbUrl: v.string(),
	title: v.string(),
});

/**
 * Thumbnails are public catalogue art, so sign for the R2 maximum (7 days)
 * rather than the 900s default — a mounted browse view would otherwise show
 * broken images after 15 minutes without a data change to re-run the query.
 * A relaunch or any catalogue write re-signs well inside the window.
 */
const THUMB_URL_TTL_SEC = 604_800;
export const thumbUrlFor = (thumbKey: string) =>
	r2.getUrl(thumbKey, { expiresIn: THUMB_URL_TTL_SEC });

function attributionFor(track: {
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

const SHELF_SIZE = 4;
const POOL_SIZE = 12;
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/**
 * The New shelf's rotation pool: tracks still inside their `newUntil` window
 * (newest window first), topped up with the most recently ingested active
 * tracks so the shelf never empties once every window has passed — it did,
 * on 2026-10-17, when the whole prod manifest's staggered `newUntil`s ran out.
 * No new index — the catalogue is a bounded few hundred rows (docs/paths-v1.md
 * decision 18), so a bounded read + in-memory sort beats indexing a field
 * most rows leave unset. Callers read newest-first, so a catalogue past
 * 1000 rows drops its oldest tracks, not the ones the top-up wants.
 */
function newPool(tracks: Doc<"audio_tracks">[], now: number) {
	const active = tracks.filter((t) => t.active);
	const fresh = active
		.filter((t) => t.newUntil !== undefined && t.newUntil > now)
		.sort((a, b) => b.newUntil! - a.newUntil!);
	const freshIds = new Set(fresh.map((t) => t._id));
	const recent = active
		.filter((t) => !freshIds.has(t._id))
		.sort((a, b) => b._creationTime - a._creationTime);
	return [...fresh, ...recent].slice(0, POOL_SIZE);
}

/**
 * The New shelf: `SHELF_SIZE` tracks from `newPool`, rotated one step per
 * `day`. `day` comes from the client (UTC days since epoch) because a
 * Convex query result is cached until its data changes — `Date.now()` alone
 * never re-runs it, which is why the shelf sat frozen. `hour` (UTC hours
 * since epoch) is the `newUntil` expiry clock — `day` alone would keep a
 * track fresh until the next UTC midnight. Pre-`day` clients get the pool's
 * head, unrotated. Reused for the Discovery strip (§9.5).
 */
export const getNewShelf = query({
	args: { day: v.optional(v.number()), hour: v.optional(v.number()) },
	handler: async (ctx, { day, hour }) => {
		await requireAuth(ctx);
		const now =
			hour === undefined
				? day === undefined
					? Date.now()
					: day * DAY_MS
				: hour * HOUR_MS;

		const pool = newPool(
			await ctx.db.query("audio_tracks").order("desc").take(1000),
			now
		);
		const offset = pool.length > 0 && day !== undefined ? day % pool.length : 0;
		const shelf = [...pool.slice(offset), ...pool.slice(0, offset)].slice(
			0,
			SHELF_SIZE
		);

		return await Promise.all(
			shelf.map(async (t) => ({
				_id: t._id,
				attribution: attributionFor(t),
				family: t.family,
				slug: t.slug,
				thumbhash: t.thumbhash,
				thumbUrl: await thumbUrlFor(t.thumbKey),
				title: t.title,
			}))
		);
	},
	returns: v.array(shelfItemValidator),
});

/**
 * Browse hub hero: the hand-picked `featured` active track, if any — set from
 * the Convex dashboard, no ordering rule needed since only one shows. Falls
 * back to the head of the New pool, so an unflagged catalogue still shows
 * something.
 */
export const getFeatured = query({
	args: {},
	handler: async (ctx) => {
		await requireAuth(ctx);
		const tracks = await ctx.db.query("audio_tracks").order("desc").take(1000);
		const picked =
			tracks.find((t) => t.active && t.featured) ??
			newPool(tracks, Date.now())[0];
		if (!picked) {
			return null;
		}

		return {
			_id: picked._id,
			attribution: attributionFor(picked),
			family: picked.family,
			slug: picked.slug,
			thumbhash: picked.thumbhash,
			thumbUrl: await thumbUrlFor(picked.thumbKey),
			title: picked.title,
		};
	},
	returns: v.union(shelfItemValidator, v.null()),
});

// ---------------------------------------------------------------------------
// Browsing screens (#339, docs/paths-v1.md §9.3)
// ---------------------------------------------------------------------------

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
});

export async function toTrackItem(t: Doc<"audio_tracks">) {
	return {
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
	};
}

const topicTitle = (slug: string) => {
	const words = slug.replace(/_/g, " ");
	return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Per-family list — `active` rows only, page size chosen by the client (30). */
export const listByFamily = query({
	args: { family: familyValidator, paginationOpts: paginationOptsValidator },
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const result = await ctx.db
			.query("audio_tracks")
			.withIndex("by_family_and_active", (q) =>
				q.eq("family", args.family).eq("active", true)
			)
			.paginate(args.paginationOpts);
		return { ...result, page: await Promise.all(result.page.map(toTrackItem)) };
	},
	returns: v.object({
		continueCursor: v.string(),
		isDone: v.boolean(),
		page: v.array(trackItemValidator),
		pageStatus: v.optional(
			v.union(
				v.literal("SplitRecommended"),
				v.literal("SplitRequired"),
				v.null()
			)
		),
		splitCursor: v.optional(v.union(v.string(), v.null())),
	}),
});

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

/** Topic grid — one tile per shared topic with ≥ 1 active track in either family. */
export const getTopics = query({
	args: {},
	handler: async (ctx) => {
		await requireAuth(ctx);
		return await Promise.all(
			(await activeTopics(ctx)).map(async ({ thumbKey, ...t }) => ({
				...t,
				thumbUrl: await thumbUrlFor(thumbKey),
			}))
		);
	},
	returns: v.array(
		v.object({
			musicCount: v.number(),
			slug: v.string(),
			supportCount: v.number(),
			thumbhash: v.optional(v.string()),
			thumbUrl: v.string(),
			title: v.string(),
		})
	),
});

/** Topic screen header: the curated `topics` title (#353), else the slug-derived one the grid uses. */
export const getTopicTitle = query({
	args: { slug: v.string() },
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const row = await ctx.db
			.query("topics")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.unique();
		return row?.title || topicTitle(args.slug);
	},
	returns: v.string(),
});

/** Topic screen — both families' active tracks for one shared topic slug. */
export const getTopic = query({
	args: { slug: v.string() },
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const [support, music] = await Promise.all([
			ctx.db
				.query("audio_tracks")
				.withIndex("by_family_and_topic", (q) =>
					q.eq("family", "support").eq("topic", `audio_topic_${args.slug}`)
				)
				.take(1000),
			ctx.db
				.query("audio_tracks")
				.withIndex("by_family_and_topic", (q) =>
					q.eq("family", "music").eq("topic", `music_topic_${args.slug}`)
				)
				.take(1000),
		]);
		return await Promise.all(
			[...support, ...music].filter((t) => t.active).map(toTrackItem)
		);
	},
	returns: v.array(trackItemValidator),
});
