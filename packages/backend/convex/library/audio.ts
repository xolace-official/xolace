import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type QueryCtx, query } from "../_generated/server";
import { r2 } from "../ai/paths/audioTracks";
import { requireAuth } from "../lib/auth";
import { hasPremium, requirePremium } from "../lib/premium";
import { coversOf } from "./entries";

/**
 * Per-entry audio (#411, decision in #390). A free reader only ever gets the
 * separate 30s preview blob; the full blob is minted only for Plus — a
 * client-side cutoff against the full file would leak it through the signed
 * URL and the lock-screen scrubber.
 */

/** Same window as `paths.getBoundAudioTrack`: covers a whole listen plus a pause. */
const AUDIO_URL_TTL_SEC = 3600;
/** Length of the preview blob `scripts/library/ingest.ts` cuts (#390). */
const PREVIEW_SEC = 30;

export const activeAudio = async (
	ctx: QueryCtx,
	entryId: Id<"library_entries">
) => {
	const a = await ctx.db
		.query("library_entry_audio")
		.withIndex("by_entryId", (q) => q.eq("entryId", entryId))
		.unique();
	return a?.active ? a : null;
};

/** The card's "M min listen", or undefined when the entry has no audio. */
export const listenMin = async (
	ctx: QueryCtx,
	entryId: Id<"library_entries">
) => {
	const a = await activeAudio(ctx, entryId);
	return a ? Math.max(1, Math.round(a.durationSec / 60)) : undefined;
};

/**
 * The reader's playable clip: the full asset for Plus, the preview for
 * everyone else. `preview` tells the dock to swap to its unlock state at the
 * end instead of just stopping. Null when the entry has no active audio.
 */
export const getEntryAudio = query({
	args: { entryId: v.id("library_entries") },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const entry = await ctx.db.get("library_entries", args.entryId);
		const audio = entry?.active ? await activeAudio(ctx, args.entryId) : null;
		if (!(entry && audio)) {
			return null;
		}
		const preview = !(await hasPremium(ctx, profile));
		return {
			durationSec: preview
				? Math.min(PREVIEW_SEC, audio.durationSec)
				: audio.durationSec, // of what `url` plays
			expiresAt: Date.now() + AUDIO_URL_TTL_SEC * 1000,
			preview,
			title: audio.title ?? entry.title,
			url: await r2.getUrl(preview ? audio.previewKey : audio.key, {
				expiresIn: AUDIO_URL_TTL_SEC,
			}),
			...(await coversOf(entry)),
		};
	},
	returns: v.union(
		v.null(),
		v.object({
			coverThumbhash: v.optional(v.string()),
			coverThumbUrl: v.optional(v.string()),
			coverUrl: v.optional(v.string()),
			durationSec: v.number(),
			expiresAt: v.number(),
			preview: v.boolean(),
			title: v.string(),
			url: v.string(),
		})
	),
});

/** What's said, as plain text. Plus only; null when the entry has no audio. */
export const getTranscript = query({
	args: { entryId: v.id("library_entries") },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		await requirePremium(ctx, profile, "audio transcript");
		const entry = await ctx.db.get("library_entries", args.entryId);
		if (!(entry?.active && (await activeAudio(ctx, args.entryId)))) {
			return null;
		}
		const t = await ctx.db
			.query("library_entry_transcripts")
			.withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
			.unique();
		return t?.text ?? null;
	},
	returns: v.union(v.null(), v.string()),
});

/**
 * Audio manifest pass (`scripts/library/ingest.ts`), keyed on `entrySlug`.
 * Keys are unique per upload attempt (the script mints fresh ones), so on an
 * unchanged `sha256` the just-uploaded blobs are deleted, and on a change the
 * old ones are. Script-only, same trust model as `audioTracks.mintUploadUrl`.
 */
export const upsertEntryAudio = internalMutation({
	args: {
		audio: v.object({
			active: v.boolean(),
			durationSec: v.number(),
			entrySlug: v.string(),
			key: v.string(),
			previewKey: v.string(),
			sha256: v.string(),
			title: v.optional(v.string()),
			transcript: v.string(),
		}),
	},
	handler: async (ctx, { audio }) => {
		const { entrySlug, transcript, ...fields } = audio;
		const dropUpload = () =>
			Promise.all([
				r2.deleteObject(ctx, fields.key),
				r2.deleteObject(ctx, fields.previewKey),
			]);
		const entry = await ctx.db
			.query("library_entries")
			.withIndex("by_slug", (q) => q.eq("slug", entrySlug))
			.unique();
		// A throw rolls back any delete here; the fresh upload is left as a harmless orphan.
		if (!entry) {
			throw new ConvexError(`library audio: unknown entry "${entrySlug}"`);
		}

		const existing = await ctx.db
			.query("library_entry_audio")
			.withIndex("by_entryId", (q) => q.eq("entryId", entry._id))
			.unique();
		if (existing?.sha256 === fields.sha256) {
			await dropUpload();
			// Title and active are metadata, outside the hash: patch them in place.
			if (
				existing.active === fields.active &&
				existing.title === fields.title
			) {
				return { action: "unchanged" as const };
			}
			await ctx.db.patch("library_entry_audio", existing._id, {
				active: fields.active,
				title: fields.title,
			});
			return { action: "updated" as const };
		}

		const doc = { ...fields, entryId: entry._id };
		const t = await ctx.db
			.query("library_entry_transcripts")
			.withIndex("by_entryId", (q) => q.eq("entryId", entry._id))
			.unique();
		if (t) {
			await ctx.db.patch("library_entry_transcripts", t._id, {
				text: transcript,
			});
		} else {
			await ctx.db.insert("library_entry_transcripts", {
				entryId: entry._id,
				text: transcript,
			});
		}

		if (!existing) {
			await ctx.db.insert("library_entry_audio", doc);
			return { action: "inserted" as const };
		}
		await ctx.db.replace("library_entry_audio", existing._id, doc);
		await Promise.all([
			r2.deleteObject(ctx, existing.key),
			r2.deleteObject(ctx, existing.previewKey),
		]);
		return { action: "updated" as const };
	},
	returns: v.object({
		action: v.union(
			v.literal("inserted"),
			v.literal("updated"),
			v.literal("unchanged")
		),
	}),
});
