import { type ObjectType, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { attributionFor, familyValidator, thumbUrlFor } from "./catalogue";

/**
 * Browse hub reads (#338, docs/paths-v1.md §9.3). Open to every signed-in
 * user — the free-user gate is on playback (the `player` route, #340), not
 * on browsing (§9.4) — so the `browse/` reads never call `requirePremium`.
 */

export const shelfItemValidator = v.object({
	_id: v.id("audio_tracks"),
	attribution: v.optional(v.string()),
	family: familyValidator,
	slug: v.string(),
	thumbhash: v.optional(v.string()),
	thumbUrl: v.string(),
	title: v.string(),
});

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
export function newPool(tracks: Doc<"audio_tracks">[], now: number) {
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

export const getNewShelfArgs = {
	day: v.optional(v.number()),
	hour: v.optional(v.number()),
};

/**
 * The New shelf: `SHELF_SIZE` tracks from `newPool`, rotated one step per
 * `day`. `day` comes from the client (UTC days since epoch) because a
 * Convex query result is cached until its data changes — `Date.now()` alone
 * never re-runs it, which is why the shelf sat frozen. `hour` (UTC hours
 * since epoch) is the `newUntil` expiry clock — `day` alone would keep a
 * track fresh until the next UTC midnight. Pre-`day` clients get the pool's
 * head, unrotated. Reused for the Discovery strip (§9.5).
 */
export async function getNewShelfCore(
	ctx: QueryCtx,
	{ day, hour }: ObjectType<typeof getNewShelfArgs>
) {
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
}

export const getNewShelf = query({
	args: getNewShelfArgs,
	handler: getNewShelfCore,
	returns: v.array(shelfItemValidator),
});

/**
 * Browse hub hero: the hand-picked `featured` active track, if any — set from
 * the Convex dashboard, no ordering rule needed since only one shows. Falls
 * back to the head of the New pool, so an unflagged catalogue still shows
 * something.
 */
export async function getFeaturedCore(ctx: QueryCtx) {
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
}

export const getFeatured = query({
	args: {},
	handler: getFeaturedCore,
	returns: v.union(shelfItemValidator, v.null()),
});
