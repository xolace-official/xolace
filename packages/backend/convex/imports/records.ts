import { type Infer, v } from "convex/values";
import {
	topicUpsertValidator,
	trackUpsertValidator,
} from "../ai/paths/audioTracks";
import { licenceValidator } from "../lib/validators";
import { manifestSource } from "../library/sources";
import schema from "../schema";

/**
 * The record shapes an admin import reads (admin v1 step 6c): the ingest
 * scripts' JSON files, recognised in the browser by their keys and sent here
 * one record at a time. File paths (`bodyPath`, `coverPath`, `audioPath`,
 * `thumbPath`) name files in the same drop; the browser reads them and sends
 * what they hold (a body's text, a processed image's hash).
 */

export const importTarget = schema.tables.import_runs.validator.fields.target;
export type ImportTarget = Infer<typeof importTarget>;

export const recordType = schema.tables.import_items.validator.fields.type;
export type RecordType = Infer<typeof recordType>;

/** What a dropped JSON file holds, as the browser recognised it. */
export const dropRole = v.union(
	v.literal("sources"),
	v.literal("entries"),
	v.literal("hubs"),
	v.literal("narration"),
	v.literal("topics"),
	v.literal("tracks")
);
export type DropRole = Infer<typeof dropRole>;

export const ROLE_TYPE: Record<DropRole, RecordType> = {
	entries: "entry",
	hubs: "hub",
	narration: "narration",
	sources: "source",
	topics: "topic",
	tracks: "track",
};

/** Which roles each target reads; anything else in a drop is rejected. */
export const TARGET_ROLES: Record<ImportTarget, readonly DropRole[]> = {
	audio: ["topics", "tracks"],
	library: ["sources", "entries", "hubs", "narration"],
};

/**
 * Apply order, as the library script runs it: an entry may credit a source
 * from the same drop, and a hub may hold its entries.
 */
export const PHASE: Record<RecordType, number> = {
	entry: 1,
	hub: 2,
	narration: 3,
	source: 0,
	topic: 0,
	track: 0,
};

export const TYPE_LABEL: Record<RecordType, string> = {
	entry: "entry",
	hub: "hub",
	narration: "narration",
	source: "source",
	topic: "topic",
	track: "track",
};

/** A batch, not a catalogue: past this, split the files. */
export const MAX_RECORDS = 500;
/** A body or transcript this long is a mistake, and would crowd the 1 MB item. */
export const MAX_TEXT_CHARS = 200_000;

const audioExt = v.union(v.literal("mp3"), v.literal("m4a"), v.literal("wav"));

/** One record as the browser sends it, with what its files held. */
export const dropRecord = v.object({
	/** The track's audio file, hashed and probed in the browser. */
	audio: v.optional(
		v.object({
			bytes: v.number(),
			durationSec: v.number(),
			ext: audioExt,
			name: v.string(),
			sha256: v.string(),
		})
	),
	/** The entry's markdown body (`bodyPath`). */
	body: v.optional(v.string()),
	/** Why a file the record names couldn't be read: missing from the drop, not an image… */
	fileErrors: v.optional(
		v.object({
			audio: v.optional(v.string()),
			body: v.optional(v.string()),
			image: v.optional(v.string()),
		})
	),
	/**
	 * The cover or thumbnail (`coverPath`, `thumbPath`), processed as 6b does:
	 * one WebP per size the record type needs, and a ThumbHash.
	 */
	image: v.optional(
		v.object({
			bytes: v.number(),
			name: v.string(),
			/** Hex SHA-256 of the dropped file, before processing; see `imageSources.ts`. */
			sourceSha256: v.optional(v.string()),
			thumbhash: v.string(),
			webp: v.array(
				v.object({ bytes: v.number(), px: v.number(), sha256: v.string() })
			),
		})
	),
	/** Checked per record against the shapes below, so one bad record doesn't sink the drop. */
	record: v.any(),
	role: dropRole,
});
export type DropRecord = Infer<typeof dropRecord>;

/** The WebP sizes each image is uploaded at, as the scripts make them. */
export const IMAGE_SIZES: Record<"entry" | "hub" | "thumb", readonly number[]> =
	{
		entry: [512, 1280],
		hub: [1280],
		thumb: [1080],
	};

// --- Record shapes, as the ingest scripts' files hold them ---

const {
	editedBy: _sourceEditedBy,
	sha256: _sourceSha,
	updatedAt: _sourceUpdatedAt,
	...sourceFields
} = schema.tables.library_sources.validator.fields;

export const sourceRecord = v.object(sourceFields);

// Covers come from `coverPath` (or a hosted `coverUrl`), never as R2 keys.
const {
	cover512Key: _cover512Key,
	cover1280Key: _cover1280Key,
	coverKey: _coverKey,
	coverThumbhash: _coverThumbhash,
	editedBy: _editedBy,
	readMin: _readMin,
	retiredAt: _retiredAt,
	safetyReviewedAt: _safetyReviewedAt,
	searchText: _searchText,
	sha256: _entrySha,
	updatedAt: _updatedAt,
	...entryFields
} = schema.tables.library_entries.validator.fields;

export const entryRecord = v.object({
	...entryFields,
	bodyPath: v.string(),
	coverPath: v.optional(v.string()),
	/** Image srcs whose empty alt is deliberate; not stored. */
	decorativeImages: v.optional(v.array(v.string())),
	facets: v.record(v.string(), v.array(v.string())), // axis → slugs
	sources: v.array(manifestSource), // credit order
});

export const hubRecord = v.object({
	active: v.boolean(),
	coverPath: v.optional(v.string()),
	coverUrl: v.optional(v.string()),
	intro: v.string(),
	items: v.array(
		v.object({
			kind: v.union(v.literal("entry"), v.literal("audio")),
			ref: v.string(),
		})
	),
	slug: v.string(),
	title: v.string(),
});

export const narrationRecord = v.object({
	active: v.boolean(),
	audioPath: v.string(),
	entrySlug: v.string(),
	title: v.optional(v.string()),
	transcriptPath: v.string(),
});

// A track as Kindling's manifest has it. The audio hash and length come from
// the file when it's dropped; without it, `sha256` says the stored audio stays.
const trackFileFields = {
	audioPath: v.optional(v.string()),
	durationSec: v.optional(v.number()),
	newUntil: v.optional(v.number()),
	sha256: v.optional(v.string()),
	slug: v.string(),
	sourceTags: v.array(v.string()),
	tags: v.array(v.string()),
	thumbPath: v.optional(v.string()),
	/** Stale in old manifests: the stored hash is of the processed WebP. Ignored. */
	thumbSha256: v.optional(v.string()),
	title: v.string(),
	topic: v.string(),
};

const [supportUpsert, musicUpsert] = trackUpsertValidator.members;

export const trackRecord = v.union(
	v.object({
		...trackFileFields,
		episodeNumber: supportUpsert.fields.episodeNumber,
		family: v.literal("support"),
		narrators: supportUpsert.fields.narrators,
		safetyReviewedAt: supportUpsert.fields.safetyReviewedAt,
		series: supportUpsert.fields.series,
		seriesTitle: supportUpsert.fields.seriesTitle,
		tier: supportUpsert.fields.tier,
		transcript: supportUpsert.fields.transcript,
	}),
	v.object({
		...trackFileFields,
		family: v.literal("music"),
		licence: licenceValidator,
		whatItsFor: musicUpsert.fields.whatItsFor,
	})
);

export const topicRecord = v.object({
	slug: v.string(),
	thumbPath: v.optional(v.string()),
	/** As in tracks: ignored. */
	thumbSha256: v.optional(v.string()),
	title: v.optional(v.string()),
});

export type SourceRecord = Infer<typeof sourceRecord>;
export type EntryRecord = Infer<typeof entryRecord>;
export type HubRecordFile = Infer<typeof hubRecord>;
export type TrackRecordFile = Infer<typeof trackRecord>;
export type TopicRecordFile = Infer<typeof topicRecord>;

// --- What an item's apply step writes (`import_items.payload`, as JSON) ---

const coverKeys = {
	cover512Key: v.optional(v.string()),
	cover1280Key: v.optional(v.string()),
	coverKey: v.optional(v.string()),
	coverThumbhash: v.optional(v.string()),
};

const { coverPath: _coverPath, ...hubFields } = hubRecord.fields;

/** The arguments of each record type's shared write, covers resolved to R2 keys. */
export const itemPayload = v.union(
	v.object({ source: sourceRecord, type: v.literal("source") }),
	v.object({
		decorativeImages: v.optional(v.array(v.string())),
		facets: v.record(v.string(), v.array(v.string())),
		fields: v.object({ ...entryFields, ...coverKeys }),
		markdown: v.string(),
		sources: v.array(manifestSource),
		type: v.literal("entry"),
	}),
	v.object({
		hub: v.object({
			...hubFields,
			cover1280Key: coverKeys.cover1280Key,
			coverKey: coverKeys.coverKey,
			coverThumbhash: coverKeys.coverThumbhash,
		}),
		type: v.literal("hub"),
	}),
	v.object({ track: trackUpsertValidator, type: v.literal("track") }),
	v.object({ topic: topicUpsertValidator, type: v.literal("topic") })
);
export type ItemPayload = Infer<typeof itemPayload>;
