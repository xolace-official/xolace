import type { Infer } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import {
	assertTrackLive,
	assertTrackShape,
	SAFETY_REVIEW_TIER,
	withStoredProof,
} from "../admin/audio";
import { assertSlug } from "../admin/edits";
import {
	assertSha256,
	assertThumbhash,
	audioKeyPrefix,
	imageKey,
} from "../admin/uploads";
import type { trackUpsertValidator } from "../ai/paths/audioTracks";
import { TOPIC_SLUGS, topicTitle } from "../ai/paths/catalog";
import type { licenceValidator } from "../lib/validators";
import {
	dateField,
	diffViews,
	showDuration,
	showHash,
	showList,
	showText,
	timeField,
	type View,
} from "./diff";
import { unlessSameSource } from "./imageSources";
import {
	type CompareScope,
	needUpload,
	type PlannedItem,
	parseRecord,
	planned,
	reject,
	type UploadNeed,
	versionOf,
} from "./plan";
import {
	type DropRecord,
	IMAGE_SIZES,
	MAX_TEXT_CHARS,
	topicRecord,
	trackRecord,
} from "./records";

/**
 * Compare for the Audio target: tracks and topic covers, with the Kindling
 * script's rules (`ai/paths/audioTracks.ts upsertTrackRecord`) plus the
 * editor's: the topic must be in the catalogue, and a track that will be
 * live must pass the editor's live gates.
 */

type TrackUpsert = Infer<typeof trackUpsertValidator>;

const THUMB_PX = 1080;

/** The processed 1080 WebP thumbnail, as `thumb/<sha256>.webp`. */
function thumbOf(d: DropRecord) {
	const webp = d.image?.webp.find((w) => w.px === THUMB_PX);
	if (!(d.image && webp)) {
		return;
	}
	if (d.image.webp.length !== IMAGE_SIZES.thumb.length) {
		reject(`${d.image.name} wasn't processed at ${THUMB_PX}px`);
	}
	assertThumbhash(d.image.thumbhash);
	return {
		bytes: webp.bytes,
		name: d.image.name,
		thumb: {
			thumbhash: d.image.thumbhash,
			thumbKey: imageKey("thumb", webp.sha256),
			thumbSha256: webp.sha256,
		},
	};
}

type Licence = Infer<typeof licenceValidator>;

/** Every licence field, so a corrected credit or link is a change. */
const licenceView = (l: Licence | undefined): View => ({
	Licence: {
		value: l ? [l.artist, l.licenceName, l.source].join(" · ") : undefined,
	},
	"Licence acquired": dateField(l?.acquiredAt),
	"Licence attribution": {
		value: l
			? `${l.attributionText}${l.attributionRequired ? " (required)" : ""}`
			: undefined,
	},
	"Licence proof": {
		exact: l?.licenceProofStorageId,
		value: l?.licenceProofStorageId ? "Attached" : undefined,
	},
	"Licence ref": { value: showText(l?.licenceRef) },
	"Licence URL": { value: showText(l?.licenceUrl) },
	"Source URL": { value: showText(l?.sourceUrl) },
});

function trackView(t: TrackUpsert | Doc<"audio_tracks">): View {
	const support = t.family === "support";
	return {
		"Source tags": { value: showList(t.sourceTags) },
		Tags: { value: showList(t.tags) },
		Title: { value: t.title },
		Topic: { value: t.topic },
		...(support
			? {
					Episode: { value: t.episodeNumber?.toString() },
					Narrators: { value: showList(t.narrators) },
					"Safety review": timeField(t.safetyReviewedAt),
					Series: { value: showText(t.series) },
					"Series title": { value: showText(t.seriesTitle) },
					Tier: { value: t.tier?.toString() },
					Transcript: { long: true, value: showText(t.transcript) },
				}
			: {
					...licenceView(t.licence),
					"What it's for": { value: showText(t.whatItsFor) },
				}),
		Audio: { value: showHash(t.sha256) },
		Length: {
			exact: t.durationSec.toString(),
			value: showDuration(t.durationSec),
		},
		"New until": dateField(t.newUntil),
		Thumbnail: { value: showHash(t.thumbSha256) },
	};
}

export async function compareTrack(
	scope: CompareScope,
	d: DropRecord,
	index: number
): Promise<PlannedItem> {
	const record = parseRecord(trackRecord, d.record);
	const {
		audioPath,
		durationSec: _manifestDuration, // the file's own length wins
		sha256: fileSha,
		thumbPath,
		thumbSha256: _staleThumbSha,
		...fields
	} = record;
	const { slug, family } = fields;
	const stored = await scope.ctx.db
		.query("audio_tracks")
		.withIndex("by_slug", (q) => q.eq("slug", slug))
		.unique();
	if (stored && stored.family !== family) {
		reject(
			`Stored as a ${stored.family} track; a file can't change its family. Make a new track instead.`
		);
	}
	if (!stored) {
		assertSlug(slug);
	}
	if (
		"transcript" in fields &&
		(fields.transcript?.length ?? 0) > MAX_TEXT_CHARS
	) {
		reject(
			`The transcript is over ${MAX_TEXT_CHARS.toLocaleString()} characters`
		);
	}

	// Audio: the dropped file, else the stored one when the record says it's the same.
	let audio: Pick<TrackUpsert, "durationSec" | "key" | "sha256">;
	let audioUpload: UploadNeed | undefined;
	if (d.audio) {
		assertSha256(d.audio.sha256);
		if (!(Number.isInteger(d.audio.durationSec) && d.audio.durationSec > 0)) {
			reject(`Can't tell how long ${d.audio.name} is`);
		}
		const same = stored?.sha256 === d.audio.sha256;
		const key = same
			? (stored?.key ?? "")
			: `${audioKeyPrefix(family, slug)}${crypto.randomUUID()}.${d.audio.ext}`;
		audio = {
			// The same file keeps its stored length: the browser rounds its own
			// reading, which can differ by a second from the script's.
			durationSec: same
				? (stored?.durationSec ?? d.audio.durationSec)
				: d.audio.durationSec,
			key,
			sha256: d.audio.sha256,
		};
		if (!same) {
			audioUpload = { bytes: d.audio.bytes, index, key, part: "audio" };
		}
	} else if (stored && (fileSha === undefined || fileSha === stored.sha256)) {
		audio = {
			durationSec: stored.durationSec,
			key: stored.key,
			sha256: stored.sha256,
		};
	} else {
		return reject(
			d.fileErrors?.audio ??
				(stored
					? `Its audio changed (sha256 differs from what's stored), but ${audioPath ?? "the file"} isn't in the drop.`
					: `${audioPath ?? "Its audio file"} isn't in the drop.`)
		);
	}
	const dropped = thumbOf(await unlessSameSource(scope, d, stored?.thumbKey));
	let thumb: Pick<TrackUpsert, "thumbhash" | "thumbKey" | "thumbSha256">;
	if (dropped) {
		thumb = dropped.thumb;
	} else if (stored) {
		thumb = {
			thumbhash: stored.thumbhash,
			thumbKey: stored.thumbKey,
			thumbSha256: stored.thumbSha256,
		};
	} else {
		return reject(
			d.fileErrors?.image ??
				`${thumbPath ?? "Its thumbnail"} isn't in the drop.`
		);
	}

	const track: TrackUpsert =
		fields.family === "music"
			? {
					...fields,
					...audio,
					...thumb,
					licence: withStoredProof(
						fields.licence,
						stored?.family === "music" ? stored.licence : undefined
					),
				}
			: { ...fields, ...audio, ...thumb };
	const willBeLive = stored ? stored.active : true;
	assertTrackShape(track);
	if (willBeLive) {
		assertTrackLive(track);
	} else if (
		track.family === "support" &&
		(track.tier ?? 0) >= SAFETY_REVIEW_TIER &&
		!track.safetyReviewedAt
	) {
		reject(`Tier ${track.tier} needs safetyReviewedAt`);
	}

	const thumbUpload =
		dropped && dropped.thumb.thumbKey !== stored?.thumbKey
			? {
					bytes: dropped.bytes,
					index,
					key: dropped.thumb.thumbKey,
					part: THUMB_PX,
				}
			: undefined;
	const uploads = [audioUpload, thumbUpload].filter(
		(u): u is UploadNeed => u !== undefined
	);
	const media: PlannedItem["media"] = [];
	if (audioUpload && d.audio) {
		media.push({ bytes: d.audio.bytes, kind: "audio", name: d.audio.name });
	}
	if (thumbUpload && d.image) {
		media.push({ bytes: d.image.bytes, kind: "thumb", name: d.image.name });
	}
	return planned({
		baseVersion: stored ? versionOf(stored) : undefined,
		changes: stored ? diffViews(trackView(stored), trackView(track)) : [],
		editedBy: stored?.editedBy,
		media: media.length > 0 ? media : undefined,
		payload: { track, type: "track" },
		slug,
		stored,
		title: track.title,
		type: "track",
		uploads: uploads.map((u) => needUpload(scope, u)),
		warnings: stored
			? undefined
			: [
					"New tracks go live as soon as they're imported, as with the Kindling script.",
				],
	});
}

const topicView = (t: { thumbSha256?: string; title?: string }): View => ({
	Cover: { value: showHash(t.thumbSha256) },
	Title: { value: showText(t.title) },
});

export async function compareTopic(
	scope: CompareScope,
	d: DropRecord,
	index: number
): Promise<PlannedItem> {
	const { slug, thumbPath, title } = parseRecord(topicRecord, d.record);
	if (!TOPIC_SLUGS.has(slug)) {
		reject(`"${slug}" isn't a catalogued topic`);
	}
	const stored = await scope.ctx.db
		.query("topics")
		.withIndex("by_slug", (q) => q.eq("slug", slug))
		.unique();
	const dropped = thumbOf(await unlessSameSource(scope, d, stored?.thumbKey));
	const thumb =
		dropped?.thumb ??
		(stored
			? {
					thumbhash: stored.thumbhash,
					thumbKey: stored.thumbKey,
					thumbSha256: stored.thumbSha256,
				}
			: reject(
					d.fileErrors?.image ??
						`${thumbPath ?? "Its cover"} isn't in the drop.`
				));
	const topic = { slug, title, ...thumb };
	const upload =
		dropped && thumb.thumbKey !== stored?.thumbKey
			? { bytes: dropped.bytes, index, key: thumb.thumbKey, part: THUMB_PX }
			: undefined;
	return planned({
		baseVersion: stored ? versionOf(stored) : undefined,
		changes: stored ? diffViews(topicView(stored), topicView(topic)) : [],
		editedBy: stored?.editedBy,
		media:
			upload && d.image
				? [{ bytes: d.image.bytes, kind: "thumb", name: d.image.name }]
				: undefined,
		payload: { topic, type: "topic" },
		slug,
		stored,
		title: title || stored?.title || topicTitle(slug),
		type: "topic",
		uploads: upload ? [needUpload(scope, upload)] : undefined,
	});
}
