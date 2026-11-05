import { ConvexError, v } from "convex/values";
import {
	internalMutation,
	internalQuery,
	type QueryCtx,
} from "../_generated/server";
import { assertSha256, assertThumbhash } from "../admin/uploads";
import { BADGE_ART_FALLBACK, UPLOADABLE_ART_KEYS } from "./catalog";

/**
 * Badge art per deployment (#690). The upload script
 * (scripts/badges/upload.ts) cuts each approved image out and fills
 * `badge_art` here; readers resolve an `artKey` with `badgeArt`.
 */

/** Far above the ~50 distinct images the catalog has. */
const BADGE_ART_LIMIT = 500;

export const badgeArtValidator = v.object({
	// Draw it as the locked silhouette whether or not it's earned: it's not this badge's art.
	fallback: v.boolean(),
	thumbhash: v.union(v.string(), v.null()),
	url: v.union(v.string(), v.null()),
});

export type BadgeArt = typeof badgeArtValidator.type;

/** The image for `artKey`, else the fallback, else nothing to draw (`url: null`). */
export async function badgeArt(
	ctx: QueryCtx,
	artKey: string
): Promise<BadgeArt> {
	const own = await servedArt(ctx, artKey);
	if (own) {
		return { ...own, fallback: false };
	}
	const fallback = await servedArt(ctx, BADGE_ART_FALLBACK);
	if (fallback) {
		return { ...fallback, fallback: true };
	}
	return { fallback: true, thumbhash: null, url: null };
}

function artRow(ctx: QueryCtx, artKey: string) {
	return ctx.db
		.query("badge_art")
		.withIndex("by_artKey", (q) => q.eq("artKey", artKey))
		.unique();
}

/** The row's image URL and thumbhash, or undefined with no row or a missing blob. */
async function servedArt(ctx: QueryCtx, artKey: string) {
	const row = await artRow(ctx, artKey);
	const url = row && (await ctx.storage.getUrl(row.storageId));
	return url ? { thumbhash: row.thumbhash, url } : undefined;
}

/** The script POSTs one cut-out WebP here, then calls `upsertArt`. */
export const generateUploadUrl = internalMutation({
	args: {},
	handler: async (ctx) => await ctx.storage.generateUploadUrl(),
	returns: v.string(),
});

/** What each artKey holds now, so a re-run skips images that haven't changed. */
export const listArt = internalQuery({
	args: {},
	handler: async (ctx) => {
		const rows = await ctx.db.query("badge_art").take(BADGE_ART_LIMIT);
		return rows.map(({ artKey, sha256 }) => ({ artKey, sha256 }));
	},
	returns: v.array(v.object({ artKey: v.string(), sha256: v.string() })),
});

/** One row per artKey: a re-upload replaces the row and deletes the image it pointed at. */
export const upsertArt = internalMutation({
	args: {
		artKey: v.string(),
		sha256: v.string(),
		storageId: v.id("_storage"),
		thumbhash: v.string(),
	},
	handler: async (ctx, { artKey, sha256, storageId, thumbhash }) => {
		if (!UPLOADABLE_ART_KEYS.has(artKey)) {
			throw new ConvexError(`artKey "${artKey}" isn't in the catalog`);
		}
		assertSha256(sha256);
		assertThumbhash(thumbhash);
		if (!(await ctx.db.system.get("_storage", storageId))) {
			throw new ConvexError("no such upload");
		}
		const fields = { sha256, storageId, thumbhash, updatedAt: Date.now() };
		const existing = await artRow(ctx, artKey);
		if (!existing) {
			await ctx.db.insert("badge_art", { artKey, ...fields });
			return "inserted" as const;
		}
		await ctx.db.patch("badge_art", existing._id, fields);
		if (existing.storageId !== storageId) {
			await ctx.storage.delete(existing.storageId);
		}
		return "updated" as const;
	},
	returns: v.union(v.literal("inserted"), v.literal("updated")),
});
