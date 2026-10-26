import type { UserIdentity } from "convex/server";
import { ConvexError, type Infer, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { reindexTrack } from "../ai/paths/audioTracks";
import { CATALOG_BY_KEY, TOPIC_SLUGS, topicTitle } from "../ai/paths/catalog";
import { adminMutation, adminQuery } from "../lib/adminAuth";
import { licenceValidator } from "../lib/validators";
import { trackSearchTextOf } from "../library/searchText";
import schema from "../schema";
import { ADMIN_LIST_LIMIT, adminStamp, notFound } from "./edits";

/**
 * Audio tracks and topics for the admin (admin v1 step 6). Metadata only:
 * creating a track, and replacing its audio or thumbnail, need uploads
 * (step 6b). The rules match `ai/paths/audioTracks.ts upsertTrack`: the topic
 * prefix fits the family, music carries a licence, and a support track at
 * tier 3 or above needs a safety review, here enforced once it's live so a
 * draft can wait for its reviewer.
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

/** Rules that hold for every saved row, live or not. */
function assertTrackShape(t: Doc<"audio_tracks">) {
	// The catalogue entry itself, not just the suffix: some topics exist for one family only.
	const prefix = t.family === "music" ? "music_topic_" : "audio_topic_";
	if (!(t.topic.startsWith(prefix) && CATALOG_BY_KEY.has(t.topic))) {
		throw trackError(t, `topic "${t.topic}" is not a ${t.family} topic`);
	}
	if (t.family === "music" && !t.licence) {
		throw trackError(t, "music needs a licence");
	}
	if (
		t.tier !== undefined &&
		!(Number.isInteger(t.tier) && t.tier >= 1 && t.tier <= 4)
	) {
		throw trackError(t, `tier ${t.tier} is not 1–4`);
	}
}

/** What a live track needs on top of its shape. */
function assertTrackLive(t: Doc<"audio_tracks">) {
	if (!t.title.trim()) {
		throw trackError(t, "needs a title");
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
function withStoredProof(
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
		sha256: before.sha256,
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
	args: {},
	handler: async (ctx) => {
		const rows = new Map(
			(await ctx.db.query("topics").take(ADMIN_LIST_LIMIT)).map((r) => [
				r.slug,
				r,
			])
		);
		return [...TOPIC_SLUGS].sort().map((slug) => {
			const row = rows.get(slug);
			return {
				hasCover: row !== undefined,
				slug,
				title: row?.title || topicTitle(slug),
			};
		});
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
		if (t.family === "support" && (licence || whatItsFor)) {
			throw trackError(t, "licence and what-it's-for are for music tracks");
		}
		await writeTrack(ctx, ctx.identity, t, {
			...t,
			...shared,
			newUntil,
			...(t.family === "music"
				? {
						licence: licence && withStoredProof(licence, t.licence),
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
