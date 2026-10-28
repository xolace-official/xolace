import type { UserIdentity } from "convex/server";
import { ConvexError, type Infer, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { r2, reindexTrack } from "../ai/paths/audioTracks";
import { CATALOG_BY_KEY, TOPIC_SLUGS, topicTitle } from "../ai/paths/catalog";
import { adminMutation, adminQuery } from "../lib/adminAuth";
import { licenceValidator } from "../lib/validators";
import { trackSearchTextOf } from "../library/searchText";
import schema from "../schema";
import { ADMIN_LIST_LIMIT, adminStamp, assertSlug, notFound } from "./edits";
import {
	assertSha256,
	assertThumbhash,
	audioKeyPrefix,
	imageKey,
	linkWindow,
	PREVIEW_URL_TTL_SEC,
} from "./uploads";

/**
 * Audio tracks and topics for the admin (admin v1 step 6). Media arrives
 * already in R2 (`./uploads.ts`); these mutations point rows at it. The rules
 * match `ai/paths/audioTracks.ts upsertTrack`: the topic prefix fits the
 * family, music carries a licence, and a support track at tier 3 or above
 * needs a safety review. The last two are enforced once it's live, so a draft
 * can wait for its licence and its reviewer.
 */

/** Support tiers from here up are acute enough to need a human safety review (§8). */
export const SAFETY_REVIEW_TIER = 3;

const { family: familyValidator } = schema.tables.audio_tracks.validator.fields;

const trackRow = v.object({
	active: v.boolean(),
	durationSec: v.number(),
	editedBy: v.optional(v.string()),
	episodeNumber: v.optional(v.number()),
	family: familyValidator,
	featured: v.boolean(),
	licence: v.optional(licenceValidator),
	narrators: v.optional(v.array(v.string())),
	newUntil: v.optional(v.number()),
	retiredAt: v.optional(v.number()),
	safetyReviewedAt: v.optional(v.number()),
	secondaryTopic: v.optional(v.string()),
	series: v.optional(v.string()),
	seriesTitle: v.optional(v.string()),
	slug: v.string(),
	sourceTags: v.array(v.string()),
	tags: v.array(v.string()),
	tier: v.optional(v.number()),
	title: v.string(),
	topic: v.string(),
	transcript: v.optional(v.string()),
	updatedAt: v.number(),
	whatItsFor: v.optional(v.string()),
});

const topicRow = v.object({
	coverUrl: v.optional(v.string()),
	hasCover: v.boolean(),
	slug: v.string(),
	title: v.string(),
});

const toRow = (t: Doc<"audio_tracks">): Infer<typeof trackRow> => ({
	active: t.active,
	durationSec: t.durationSec,
	editedBy: t.editedBy,
	episodeNumber: t.episodeNumber,
	family: t.family,
	featured: t.featured ?? false,
	licence: t.licence,
	narrators: t.narrators,
	newUntil: t.newUntil,
	retiredAt: t.retiredAt,
	safetyReviewedAt: t.safetyReviewedAt,
	secondaryTopic: t.secondaryTopic,
	series: t.series,
	seriesTitle: t.seriesTitle,
	slug: t.slug,
	sourceTags: t.sourceTags,
	tags: t.tags,
	tier: t.tier,
	title: t.title,
	topic: t.topic,
	transcript: t.transcript,
	updatedAt: t.updatedAt ?? t._creationTime,
	whatItsFor: t.whatItsFor,
});

async function trackBySlug(ctx: QueryCtx, slug: string) {
	const t = await ctx.db
		.query("audio_tracks")
		.withIndex("by_slug", (q) => q.eq("slug", slug))
		.unique();
	if (!t) {
		throw notFound("audio track", slug);
	}
	return t;
}

const trackError = (t: Pick<Doc<"audio_tracks">, "slug">, why: string) =>
	new ConvexError(`audio track "${t.slug}": ${why}`);

type TrackRules = Pick<
	Doc<"audio_tracks">,
	| "family"
	| "licence"
	| "safetyReviewedAt"
	| "secondaryTopic"
	| "slug"
	| "tier"
	| "title"
	| "topic"
>;

/** Rules that hold for every saved row, live or not. */
export function assertTrackShape(t: TrackRules) {
	// The catalogue entry itself, not just the suffix: some topics exist for one family only.
	const prefix = t.family === "music" ? "music_topic_" : "audio_topic_";
	if (!(t.topic.startsWith(prefix) && CATALOG_BY_KEY.has(t.topic))) {
		throw trackError(t, `topic "${t.topic}" is not a ${t.family} topic`);
	}
	const second = t.secondaryTopic;
	if (
		second !== undefined &&
		!(
			t.family === "music" &&
			second !== t.topic &&
			second.startsWith(prefix) &&
			CATALOG_BY_KEY.has(second)
		)
	) {
		throw trackError(
			t,
			`secondary topic "${second}" is not another music topic`
		);
	}
	if (
		t.tier !== undefined &&
		!(Number.isInteger(t.tier) && t.tier >= 1 && t.tier <= 4)
	) {
		throw trackError(t, `tier ${t.tier} is not 1–4`);
	}
}

/** What a live track needs on top of its shape. A draft can wait for its licence. */
export function assertTrackLive(t: TrackRules) {
	if (!t.title.trim()) {
		throw trackError(t, "needs a title");
	}
	if (t.family === "music" && !t.licence) {
		throw trackError(t, "music needs a licence");
	}
	if (
		t.licence &&
		!(
			t.licence.artist.trim() &&
			t.licence.licenceName.trim() &&
			t.licence.source.trim()
		)
	) {
		throw trackError(t, "needs the licence's artist, name and source");
	}
	if (
		t.family === "support" &&
		(t.tier ?? 0) >= SAFETY_REVIEW_TIER &&
		t.safetyReviewedAt === undefined
	) {
		throw trackError(t, `tier ${t.tier} needs a safety review`);
	}
}

type Licence = Infer<typeof licenceValidator>;

/**
 * The editor doesn't show a licence's proof upload or ref, so a save keeps the
 * stored ones, but only while it's the same licence (same source, artist and
 * licence name). A different licence starts without the old proof, even when
 * the client echoes it back from the read.
 */
export function withStoredProof(
	incoming: Licence,
	stored: Licence | undefined
): Licence {
	const { licenceProofStorageId, licenceRef, ...licence } = incoming;
	const same =
		stored &&
		stored.source === licence.source &&
		stored.sourceUrl === licence.sourceUrl &&
		stored.artist === licence.artist &&
		stored.licenceName === licence.licenceName;
	return same
		? {
				...licence,
				licenceProofStorageId: stored.licenceProofStorageId,
				licenceRef: stored.licenceRef,
			}
		: licence;
}

/** Write `next` over `before`, refresh its search text and, if what it embeds changed, its index entry. */
async function writeTrack(
	ctx: MutationCtx,
	identity: UserIdentity,
	before: Doc<"audio_tracks">,
	next: Doc<"audio_tracks">,
	{ check = true }: { check?: boolean } = {}
) {
	// Retire skips the checks: taking a track down must work even when its
	// stored row predates a rule (a topic dropped from the catalogue).
	if (check) {
		assertTrackShape(next);
		if (next.active) {
			assertTrackLive(next);
		}
	}
	const { _creationTime, _id, ...fields } = next;
	await ctx.db.replace("audio_tracks", before._id, {
		...fields,
		...adminStamp(identity),
		// `sha256` is the audio's hash on tracks, not the record's: keep it.
		searchText: trackSearchTextOf(next),
		sha256: next.sha256,
	});
	await reindexTrack(ctx, before, before._id);
}

/** Every track, live or not. 442 in prod: one read until the catalogue nears the cap. */
export const list = adminQuery({
	args: {},
	handler: async (ctx) =>
		(
			await ctx.db.query("audio_tracks").order("desc").take(ADMIN_LIST_LIMIT)
		).map(toRow),
	returns: v.array(trackRow),
});

/** Every catalogued topic, with its cover and title where a `topics` row has them. */
export const topics = adminQuery({
	// Only keys the cache: see `linkWindow`.
	args: { linkWindow },
	handler: async (ctx) => {
		const rows = new Map(
			(await ctx.db.query("topics").take(ADMIN_LIST_LIMIT)).map((r) => [
				r.slug,
				r,
			])
		);
		return await Promise.all(
			[...TOPIC_SLUGS].sort().map(async (slug) => {
				const row = rows.get(slug);
				return {
					coverUrl:
						row &&
						(await r2.getUrl(row.thumbKey, { expiresIn: PREVIEW_URL_TTL_SEC })),
					hasCover: row !== undefined,
					slug,
					title: row?.title || topicTitle(slug),
				};
			})
		);
	},
	returns: v.array(topicRow),
});

/**
 * Save the editor's metadata. Optional fields left out are cleared; fields
 * of the other family are rejected. A music licence keeps its stored proof.
 */
export const save = adminMutation({
	args: {
		slug: v.string(),
		track: v.object({
			featured: v.boolean(),
			licence: v.optional(licenceValidator),
			narrators: v.optional(v.array(v.string())),
			newUntil: v.optional(v.number()),
			secondaryTopic: v.optional(v.string()),
			tags: v.array(v.string()),
			tier: v.optional(v.number()),
			title: v.string(),
			topic: v.string(),
			transcript: v.optional(v.string()),
			whatItsFor: v.optional(v.string()),
		}),
	},
	handler: async (ctx, { slug, track }) => {
		const t = await trackBySlug(ctx, slug);
		const {
			licence,
			narrators,
			newUntil,
			secondaryTopic,
			tier,
			transcript,
			whatItsFor,
			...shared
		} = track;
		if (t.family === "music" && (narrators || tier || transcript)) {
			throw trackError(
				t,
				"narrators, tier and transcript are for support tracks"
			);
		}
		if (t.family === "support" && (licence || secondaryTopic || whatItsFor)) {
			throw trackError(
				t,
				"licence, secondary topic and what-it's-for are for music tracks"
			);
		}
		await writeTrack(ctx, ctx.identity, t, {
			...t,
			...shared,
			newUntil,
			...(t.family === "music"
				? {
						licence: licence && withStoredProof(licence, t.licence),
						secondaryTopic,
						whatItsFor,
					}
				: { narrators, tier, transcript }),
		});
		return null;
	},
	returns: v.null(),
});

export const publish = adminMutation({
	args: { slug: v.string() },
	handler: async (ctx, { slug }) => {
		const t = await trackBySlug(ctx, slug);
		await writeTrack(ctx, ctx.identity, t, {
			...t,
			active: true,
			retiredAt: undefined,
		});
		return null;
	},
	returns: v.null(),
});

/** Take a track down (a licence lapse, a safety concern). Reversible, never a delete. */
export const retire = adminMutation({
	args: { slug: v.string() },
	handler: async (ctx, { slug }) => {
		const t = await trackBySlug(ctx, slug);
		await writeTrack(
			ctx,
			ctx.identity,
			t,
			{
				...t,
				active: false,
				retiredAt: t.active ? Date.now() : t.retiredAt,
			},
			{ check: false }
		);
		return null;
	},
	returns: v.null(),
});

/** A reviewer's sign-off on a support track (needed live at tier 3 and up). */
export const markSafetyReviewed = adminMutation({
	args: { slug: v.string() },
	handler: async (ctx, { slug }) => {
		const t = await trackBySlug(ctx, slug);
		if (t.family !== "support") {
			throw trackError(t, "only support tracks are safety-reviewed");
		}
		await writeTrack(ctx, ctx.identity, t, {
			...t,
			safetyReviewedAt: Date.now(),
		});
		return null;
	},
	returns: v.null(),
});

/** Signed links to a track's audio and thumbnail, for the editor's player and preview. */
export const media = adminQuery({
	args: { linkWindow, slug: v.string() },
	handler: async (ctx, { slug }) => {
		const t = await trackBySlug(ctx, slug);
		const [audioUrl, thumbUrl] = await Promise.all([
			r2.getUrl(t.key, { expiresIn: PREVIEW_URL_TTL_SEC }),
			r2.getUrl(t.thumbKey, { expiresIn: PREVIEW_URL_TTL_SEC }),
		]);
		return { audioUrl, thumbUrl };
	},
	returns: v.object({ audioUrl: v.string(), thumbUrl: v.string() }),
});

function assertDuration(durationSec: number) {
	if (!(Number.isInteger(durationSec) && durationSec > 0)) {
		throw new ConvexError(`${durationSec} is not a length in whole seconds`);
	}
}

/** The audio key must be one `audioUploadUrl` minted for this track. */
function assertAudioKey(family: string, slug: string, key: string) {
	if (!key.startsWith(audioKeyPrefix(family, slug))) {
		throw new ConvexError(`"${key}" wasn't uploaded for ${family}/${slug}`);
	}
}

const uploadedThumb = v.object({ sha256: v.string(), thumbhash: v.string() });

function thumbFields({ sha256, thumbhash }: Infer<typeof uploadedThumb>) {
	assertThumbhash(thumbhash);
	return {
		thumbhash,
		thumbKey: imageKey("thumb", sha256),
		thumbSha256: sha256,
	};
}

/**
 * A new draft from New track, its audio and thumbnail already uploaded.
 * Tags, the licence or transcript and the rest come from the editor.
 */
export const create = adminMutation({
	args: {
		audio: v.object({
			durationSec: v.number(),
			key: v.string(),
			sha256: v.string(),
		}),
		family: familyValidator,
		slug: v.string(),
		thumb: uploadedThumb,
		title: v.string(),
		topic: v.string(),
	},
	handler: async (ctx, { audio, family, slug, thumb, title, topic }) => {
		assertSlug(slug);
		assertDuration(audio.durationSec);
		assertSha256(audio.sha256);
		assertAudioKey(family, slug, audio.key);
		const taken = await ctx.db
			.query("audio_tracks")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.unique();
		if (taken) {
			throw new ConvexError(`audio track "${slug}" already exists`);
		}
		const track = {
			...adminStamp(ctx.identity),
			...thumbFields(thumb),
			active: false,
			durationSec: audio.durationSec,
			family,
			key: audio.key,
			sha256: audio.sha256,
			slug,
			sourceTags: [],
			tags: [],
			title,
			topic,
		};
		assertTrackShape(track);
		const id = await ctx.db.insert("audio_tracks", {
			...track,
			searchText: trackSearchTextOf(track),
		});
		await reindexTrack(ctx, null, id);
		return null;
	},
	returns: v.null(),
});

/**
 * Point a track at newly uploaded audio and drop the old file, as the ingest
 * does. New audio is new content, so a support track's safety review goes
 * with it: a live track that needs one can't take new audio until retired.
 */
export const replaceAudio = adminMutation({
	args: {
		durationSec: v.number(),
		key: v.string(),
		sha256: v.string(),
		slug: v.string(),
	},
	handler: async (ctx, { durationSec, key, sha256, slug }) => {
		const t = await trackBySlug(ctx, slug);
		assertDuration(durationSec);
		assertSha256(sha256);
		assertAudioKey(t.family, t.slug, key);
		if (sha256 === t.sha256) {
			// The same file again: keep the stored copy, and never delete it.
			if (key !== t.key) {
				await r2.deleteObject(ctx, key);
			}
			return null;
		}
		await writeTrack(ctx, ctx.identity, t, {
			...t,
			durationSec,
			key,
			safetyReviewedAt: t.family === "support" ? undefined : t.safetyReviewedAt,
			sha256,
		});
		await r2.deleteObject(ctx, t.key);
		return null;
	},
	returns: v.null(),
});

/** Point a track at an uploaded thumbnail. Thumbnails are shared by hash, so the old one stays. */
export const replaceThumb = adminMutation({
	args: { slug: v.string(), thumb: uploadedThumb },
	handler: async (ctx, { slug, thumb }) => {
		const t = await trackBySlug(ctx, slug);
		await writeTrack(ctx, ctx.identity, t, { ...t, ...thumbFields(thumb) });
		return null;
	},
	returns: v.null(),
});

/** Set a topic's cover, creating its `topics` row on the first upload. */
export const replaceTopicCover = adminMutation({
	args: { slug: v.string(), thumb: uploadedThumb },
	handler: async (ctx, { slug, thumb }) => {
		if (!TOPIC_SLUGS.has(slug)) {
			throw notFound("topic", slug);
		}
		const fields = {
			...thumbFields(thumb),
			editedBy: ctx.identity.subject,
			updatedAt: Date.now(),
		};
		const row = await ctx.db
			.query("topics")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.unique();
		if (row) {
			await ctx.db.patch("topics", row._id, fields);
		} else {
			await ctx.db.insert("topics", { ...fields, slug });
		}
		return null;
	},
	returns: v.null(),
});
