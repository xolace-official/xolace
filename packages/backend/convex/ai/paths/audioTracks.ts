import { R2 } from "@convex-dev/r2";
import { ConvexError, v } from "convex/values";
import { components, internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "../../_generated/server";
import { licenceValidator } from "../../lib/validators";
import { trackSearchTextOf } from "../../library/searchText";
import { TOPIC_SLUGS } from "./catalog";
import { indexSignature, trackNamespaces } from "./trackSearch";

/**
 * Kindling audio/music catalogue (#328, docs/paths-v1.md §3.2). Blobs live in
 * Cloudflare R2; everything else (rows, licence metadata) stays on Convex.
 */
export const r2 = new R2(components.r2);

const sharedFields = {
	durationSec: v.number(),
	key: v.string(),
	newUntil: v.optional(v.number()),
	sha256: v.string(),
	slug: v.string(),
	sourceTags: v.array(v.string()),
	tags: v.array(v.string()),
	thumbhash: v.optional(v.string()),
	thumbKey: v.string(),
	thumbSha256: v.string(),
	title: v.string(),
	topic: v.string(),
};

/**
 * Tight at write, optional at rest (docs/paths-v1.md §3.2): a support row
 * carries episode fields only when it belongs to a series; a music row
 * requires a licence. Extra keys from the wrong branch are rejected by the
 * validator itself (Convex object validators are exact-shape).
 */
export const trackUpsertValidator = v.union(
	v.object({
		family: v.literal("support"),
		...sharedFields,
		episodeNumber: v.optional(v.number()),
		narrators: v.optional(v.array(v.string())),
		safetyReviewedAt: v.optional(v.number()),
		series: v.optional(v.string()),
		seriesTitle: v.optional(v.string()),
		tier: v.optional(v.number()),
		transcript: v.optional(v.string()),
	}),
	v.object({
		family: v.literal("music"),
		...sharedFields,
		licence: licenceValidator,
		whatItsFor: v.optional(v.string()),
	})
);

/**
 * Mint a signed R2 upload URL for a caller-chosen key. No auth check — this
 * is driven only by the trusted repo ingestion script (`convex run`, the
 * developer's own CLI session), never exposed to the client.
 */
export const mintUploadUrl = internalMutation({
	args: { key: v.string() },
	handler: async (_ctx, { key }) => r2.generateUploadUrl(key),
	returns: v.object({ key: v.string(), url: v.string() }),
});

/**
 * Ingest-failure cleanup: drop blobs a failed `ingestOne` attempt left behind.
 * The audio key is unique per attempt, so it always goes; the thumb key is
 * content-addressed and may be shared, so it goes only when no `audio_tracks`
 * or `topics` row points at it. Same trust model as `mintUploadUrl`
 * (script-only).
 */
export const discardUpload = internalMutation({
	args: { audioKey: v.optional(v.string()), thumbKey: v.optional(v.string()) },
	handler: async (ctx, { audioKey, thumbKey }) => {
		if (audioKey) {
			await r2.deleteObject(ctx, audioKey);
		}
		if (thumbKey) {
			const referenced =
				(await ctx.db
					.query("audio_tracks")
					.withIndex("by_thumbKey", (q) => q.eq("thumbKey", thumbKey))
					.first()) ??
				(await ctx.db
					.query("topics")
					.withIndex("by_thumbKey", (q) => q.eq("thumbKey", thumbKey))
					.first());
			if (!referenced) {
				await r2.deleteObject(ctx, thumbKey);
			}
		}
		return null;
	},
	returns: v.null(),
});

/**
 * `slug → thumbKey` for every topic row, so the ingest script can skip the
 * cover upload when only the title changed (#354). Bounded by the catalogue
 * (one row per topic suffix), so reading every row is fine. Script-only.
 */
export const listTopicThumbKeys = internalQuery({
	args: {},
	handler: async (ctx) => {
		const keys: Record<string, string> = {};
		for await (const row of ctx.db.query("topics")) {
			keys[row.slug] = row.thumbKey;
		}
		return keys;
	},
	returns: v.record(v.string(), v.string()),
});

/**
 * Re-embed a track into the meaning index (#572), but only when what it
 * embeds changed: `before` is the row as it was (null for a new track).
 */
export async function reindexTrack(
	ctx: MutationCtx,
	before: Doc<"audio_tracks"> | null,
	trackId: Id<"audio_tracks">
) {
	const after = await ctx.db.get("audio_tracks", trackId);
	if (after && (!before || indexSignature(before) !== indexSignature(after))) {
		await ctx.scheduler.runAfter(0, internal.ai.paths.trackSearch.indexTrack, {
			trackId,
			...(before && { previousNamespaces: trackNamespaces(before) }),
		});
	}
}

/**
 * Idempotent upsert keyed on `slug`, per docs/paths-v1.md §3.4:
 * - unchanged `sha256` → delete the freshly-uploaded audio blob, no-op the row
 * - changed `sha256` → replace the row, delete the *old* audio blob
 * - a thumbnail blob is NEVER deleted (content-addressed key, shared across
 *   rows); an unchanged `thumbSha256` re-uploads to the same key (harmless
 *   overwrite), a changed one just repoints `thumbKey`.
 *
 * The audio `key` passed in must be unique per upload attempt (the script
 * mints a fresh one every run) — unlike `thumbKey`, it is not content
 * addressed, so an unchanged-sha256 duplicate really is safe to delete.
 */
export const upsertTrack = internalMutation({
	args: { track: trackUpsertValidator },
	handler: async (ctx, { track }) => {
		// Browse (#339) derives the shared topic slug by stripping this prefix and
		// rebuilds it per family — a mismatch would count on a grid tile but never
		// list on the topic screen.
		const prefix = track.family === "music" ? "music_topic_" : "audio_topic_";
		if (!track.topic.startsWith(prefix)) {
			await r2.deleteObject(ctx, track.key);
			throw new ConvexError(
				`audio_tracks upsert rejected: slug "${track.slug}" topic "${track.topic}" must start with "${prefix}"`
			);
		}

		// Editorial safeguard (§8): a tier >= 3 support row must be human-reviewed.
		// Enforced here too, not just in the script — this mutation is the real
		// trust boundary. Only the audio blob is ever cleaned up on rejection;
		// the thumb key may be shared with an already-live row and must survive.
		if (
			track.family === "support" &&
			(track.tier ?? 0) >= 3 &&
			!track.safetyReviewedAt
		) {
			await r2.deleteObject(ctx, track.key);
			throw new ConvexError(
				`audio_tracks upsert rejected: slug "${track.slug}" has tier ${track.tier} with no safetyReviewedAt`
			);
		}

		const existing = await ctx.db
			.query("audio_tracks")
			.withIndex("by_slug", (q) => q.eq("slug", track.slug))
			.unique();
		const searchText = trackSearchTextOf(track);

		const reindex = (trackId: Id<"audio_tracks">) =>
			reindexTrack(ctx, existing, trackId);
		const now = Date.now();

		if (!existing) {
			const trackId = await ctx.db.insert("audio_tracks", {
				...track,
				active: true,
				searchText,
				updatedAt: now,
			});
			await reindex(trackId);
			return { action: "inserted" as const, trackId };
		}

		if (existing.sha256 === track.sha256) {
			await r2.deleteObject(ctx, track.key);
			// Audio blob unchanged: keep the live key, but persist every other
			// field (title, tags, thumb, licence, ...) — metadata edits must land.
			await ctx.db.replace("audio_tracks", existing._id, {
				...track,
				active: existing.active,
				key: existing.key,
				retiredAt: existing.retiredAt,
				searchText,
				updatedAt: now,
			});
			await reindex(existing._id);
			const action =
				existing.thumbSha256 === track.thumbSha256
					? ("unchanged" as const)
					: ("updated" as const);
			return { action, trackId: existing._id };
		}

		const oldKey = existing.key;
		await ctx.db.replace("audio_tracks", existing._id, {
			...track,
			active: existing.active,
			retiredAt: existing.retiredAt,
			searchText,
			updatedAt: now,
		});
		await r2.deleteObject(ctx, oldKey);
		await reindex(existing._id);
		return { action: "updated" as const, trackId: existing._id };
	},
	returns: v.object({
		action: v.union(
			v.literal("inserted"),
			v.literal("updated"),
			v.literal("unchanged")
		),
		trackId: v.id("audio_tracks"),
	}),
});

/**
 * `ingest.ts --thumbs-only`: repoint an existing track at a new thumbnail
 * without re-uploading its audio. The old thumb blob is left for the same
 * reason upsertTrack never deletes one (content-addressed, maybe shared).
 */
export const setTrackThumb = internalMutation({
	args: {
		slug: v.string(),
		thumbhash: v.string(),
		thumbKey: v.string(),
		thumbSha256: v.string(),
	},
	handler: async (ctx, { slug, ...thumb }) => {
		const existing = await ctx.db
			.query("audio_tracks")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.unique();
		if (!existing) {
			throw new ConvexError(
				`setTrackThumb: no audio_tracks row for slug "${slug}"`
			);
		}
		await ctx.db.patch("audio_tracks", existing._id, thumb);
		return null;
	},
	returns: v.null(),
});

/**
 * Topic decoration (#353): the shared suffix's cover + display title for the
 * Browse topic grid. The model catalogue stays the only source of valid
 * topics — an unknown slug is rejected so presentation data can never invent
 * one. Keyed on `slug`: insert when absent, replace otherwise. Thumb blobs are
 * content-addressed and possibly shared with `audio_tracks`, so none is ever
 * deleted here; a changed cover just repoints `thumbKey`.
 */
export const upsertTopic = internalMutation({
	args: {
		topic: v.object({
			slug: v.string(),
			thumbhash: v.optional(v.string()),
			thumbKey: v.string(),
			thumbSha256: v.string(),
			title: v.optional(v.string()),
		}),
	},
	handler: async (ctx, { topic }) => {
		if (!TOPIC_SLUGS.has(topic.slug)) {
			throw new ConvexError(
				`topics upsert rejected: slug "${topic.slug}" is not a catalogued topic`
			);
		}
		const existing = await ctx.db
			.query("topics")
			.withIndex("by_slug", (q) => q.eq("slug", topic.slug))
			.unique();
		if (!existing) {
			return {
				action: "inserted" as const,
				topicId: await ctx.db.insert("topics", topic),
			};
		}
		await ctx.db.replace("topics", existing._id, topic);
		return { action: "updated" as const, topicId: existing._id };
	},
	returns: v.object({
		action: v.union(v.literal("inserted"), v.literal("updated")),
		topicId: v.id("topics"),
	}),
});
