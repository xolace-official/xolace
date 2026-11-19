import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
	type QueryCtx,
	query,
} from "../_generated/server";
import { requireAuth } from "../lib/auth";
import {
	quoteBackgroundFileValidator,
	quoteBackgroundInkValidator,
	quoteBackgroundKindValidator,
} from "../lib/validators";

/**
 * The daily quote's backgrounds (B18). One row per background, in the
 * Background sheet's order; scripts/quote-backgrounds/upload.ts fills it per
 * deployment from its manifest. Stills carry no media (the app bundles them);
 * a loop's mp4, first-frame poster and ambient track are hosted here.
 */

/** New people start on Poster, the background production has today. Always
 * accepted, catalogue or not, so going back to it can never fail. */
export const DEFAULT_QUOTE_BACKGROUND = "poster";

/** Far above the ~22 backgrounds the art plan has. */
const CATALOGUE_LIMIT = 200;

/** kebab-case, as the manifest and the app's asset map name them. */
const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SHA256 = /^[0-9a-f]{64}$/;

const MEDIA = ["video", "poster", "audio"] as const;
type MediaSlot = (typeof MEDIA)[number];

export const quoteBackgroundListItemValidator = v.object({
	/** The loop's ambient sound, when it has one. Off until the person turns it on. */
	audioUrl: v.optional(v.string()),
	ink: quoteBackgroundInkValidator,
	key: v.string(),
	kind: quoteBackgroundKindValidator,
	name: v.string(),
	/** Xolace+ only: a free account sees it, and choosing it opens the paywall. */
	plus: v.boolean(),
	/** A loop's first frame, shown until the video draws (and when loops rest). */
	posterUrl: v.optional(v.string()),
	videoUrl: v.optional(v.string()),
});

export function catalogueRow(
	ctx: QueryCtx | MutationCtx,
	key: string
): Promise<Doc<"quote_backgrounds"> | null> {
	return ctx.db
		.query("quote_backgrounds")
		.withIndex("by_key", (q) => q.eq("key", key))
		.unique();
}

const urlOf = async (
	ctx: QueryCtx,
	file: Doc<"quote_backgrounds">["video"]
): Promise<string | undefined> =>
	file ? ((await ctx.storage.getUrl(file.storageId)) ?? undefined) : undefined;

/** The active backgrounds, in order, with their media URLs. A loop whose video
 * or poster is missing (not uploaded yet, or the blob is gone) is left out:
 * there'd be nothing to play. */
export const list = query({
	args: {},
	handler: async (ctx) => {
		await requireAuth(ctx);
		const rows = await ctx.db
			.query("quote_backgrounds")
			.withIndex("by_active_and_order", (q) => q.eq("active", true))
			.take(CATALOGUE_LIMIT);
		const items = await Promise.all(
			rows.map(async (row) => {
				const base = {
					ink: row.ink,
					key: row.key,
					kind: row.kind,
					name: row.name,
					plus: row.plus,
				};
				if (row.kind === "still") {
					return base;
				}
				const [videoUrl, posterUrl, audioUrl] = await Promise.all([
					urlOf(ctx, row.video),
					urlOf(ctx, row.poster),
					urlOf(ctx, row.audio),
				]);
				if (!(videoUrl && posterUrl)) {
					return null;
				}
				return { ...base, posterUrl, videoUrl, ...(audioUrl && { audioUrl }) };
			})
		);
		return items.filter((item) => item !== null);
	},
	returns: v.array(quoteBackgroundListItemValidator),
});

// ---------------------------------------------------------------------------
// The upload script's side (internal only).
// ---------------------------------------------------------------------------

/** The script POSTs each changed file here, then passes its id to `upsert`. */
export const generateUploadUrl = internalMutation({
	args: {},
	handler: async (ctx) => await ctx.storage.generateUploadUrl(),
	returns: v.string(),
});

const liveFileValidator = v.optional(v.string());

/** Every row (retired ones too) with its files' hashes, so a re-run uploads
 * only what changed and knows which keys the manifest dropped. */
export const listForUpload = internalQuery({
	args: {},
	handler: async (ctx) => {
		const rows = await ctx.db.query("quote_backgrounds").take(CATALOGUE_LIMIT);
		return rows.map((row) => ({
			active: row.active,
			audio: row.audio?.sha256,
			key: row.key,
			poster: row.poster?.sha256,
			video: row.video?.sha256,
		}));
	},
	returns: v.array(
		v.object({
			active: v.boolean(),
			audio: liveFileValidator,
			key: v.string(),
			poster: liveFileValidator,
			video: liveFileValidator,
		})
	),
});

/**
 * One background, by key: inserts it, or updates its fields. A file passed
 * replaces the one the row had (the old blob is deleted); a file left out is
 * kept, so the script sends only what changed.
 */
export const upsert = internalMutation({
	args: {
		active: v.boolean(),
		audio: v.optional(quoteBackgroundFileValidator),
		ink: quoteBackgroundInkValidator,
		key: v.string(),
		kind: quoteBackgroundKindValidator,
		name: v.string(),
		order: v.number(),
		plus: v.boolean(),
		poster: v.optional(quoteBackgroundFileValidator),
		video: v.optional(quoteBackgroundFileValidator),
	},
	handler: async (ctx, args) => {
		const { audio, poster, video, ...meta } = args;
		if (!KEY_PATTERN.test(meta.key)) {
			throw new ConvexError(`"${meta.key}" isn't a kebab-case key`);
		}
		if (meta.name.trim() === "") {
			throw new ConvexError(`${meta.key}: a background needs a name`);
		}
		// Only the files passed: a patch with an undefined field would erase it.
		const files: Partial<Record<MediaSlot, MediaFile>> = {
			...(audio && { audio }),
			...(poster && { poster }),
			...(video && { video }),
		};
		if (meta.kind === "still" && Object.keys(files).length > 0) {
			throw new ConvexError(`${meta.key}: a still carries no hosted media`);
		}
		for (const file of Object.values(files)) {
			await assertUpload(ctx, file);
		}

		const existing = await catalogueRow(ctx, meta.key);
		const fields = { ...meta, ...files, updatedAt: Date.now() };
		if (!existing) {
			await ctx.db.insert("quote_backgrounds", fields);
			return "inserted" as const;
		}
		// A loop that became a still drops its media.
		const toStill = meta.kind === "still";
		await ctx.db.patch("quote_backgrounds", existing._id, {
			...fields,
			...(toStill && { audio: undefined, poster: undefined, video: undefined }),
		});
		const orphans = MEDIA.flatMap((slot) => {
			const before = existing[slot]?.storageId;
			const after = files[slot]?.storageId;
			return before && (toStill || (after && after !== before)) ? [before] : [];
		});
		for (const storageId of orphans) {
			await ctx.storage.delete(storageId);
		}
		return "updated" as const;
	},
	returns: v.union(v.literal("inserted"), v.literal("updated")),
});

type MediaFile = NonNullable<Doc<"quote_backgrounds">["video"]>;

async function assertUpload(ctx: MutationCtx, file: MediaFile): Promise<void> {
	if (!SHA256.test(file.sha256)) {
		throw new ConvexError(`"${file.sha256}" is not a hex SHA-256`);
	}
	if (!(await ctx.db.system.get("_storage", file.storageId))) {
		throw new ConvexError("no such upload");
	}
}

/** Takes a background off the sheet without deleting it: someone who chose it
 * keeps the key, and the app falls back to Poster for a key it can't draw. */
export const retire = internalMutation({
	args: { key: v.string() },
	handler: async (ctx, { key }) => {
		const row = await catalogueRow(ctx, key);
		if (!row) {
			throw new ConvexError(`no background "${key}"`);
		}
		if (row.active) {
			await ctx.db.patch("quote_backgrounds", row._id, {
				active: false,
				updatedAt: Date.now(),
			});
		}
		return null;
	},
	returns: v.null(),
});
