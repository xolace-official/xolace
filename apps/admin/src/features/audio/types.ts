import type { ContentStatus } from "@/features/content/status-badge";
import type { ProcessingFailure } from "@/features/library/types";

// The admin's view of `audio_tracks` and `topics` rows (packages/backend/convex/schema.ts).
// The Convex provider maps rows into these; the screens never see table shapes.

export const TRACK_FAMILIES = ["support", "music"] as const;
export type TrackFamily = (typeof TRACK_FAMILIES)[number];

export const FAMILY_LABEL: Record<TrackFamily, string> = {
	music: "Music",
	support: "Support",
};

/** `licenceValidator` in convex/lib/validators.ts, minus the proof upload. */
export interface TrackLicence {
	acquiredAt: number;
	artist: string;
	attributionRequired: boolean;
	attributionText: string;
	licenceName: string;
	licenceUrl: string;
	source: string;
	sourceUrl: string;
}

export interface AudioTrack {
	active: boolean;
	durationSec: number;
	episodeNumber?: number;
	failure?: ProcessingFailure;
	family: TrackFamily;
	/** Hand-picked Browse hero. */
	featured: boolean;
	hasThumb: boolean;
	/** Required for music. */
	licence?: TrackLicence;
	/** Support only: display names, `["Sage"]`. */
	narrators?: string[];
	/** In the Browse "New" shelf while this is in the future. */
	newUntil?: number;
	safetyReviewedAt?: number;
	series?: string;
	seriesTitle?: string;
	slug: string;
	/** Raw tags from the source (Pixabay), kept as they came. */
	sourceTags: string[];
	status: ContentStatus;
	/** Curated: the shared emotion/theme vocabulary. */
	tags: string[];
	/** Support acuity 1–4; 3 and up needs a safety review. */
	tier?: number;
	title: string;
	/** Catalogue id: `music_topic_sleep_rest`, `audio_topic_grief`. */
	topic: string;
	transcript?: string;
	updatedAt: number;
	whatItsFor?: string;
}

/** A `topics` row: the cover and title shared by `audio_topic_x` and `music_topic_x`. */
export interface AudioTopic {
	/** Signed link to the cover, while `hasCover`. */
	coverUrl?: string;
	hasCover: boolean;
	/** The shared suffix, `sleep_rest`. */
	slug: string;
	title: string;
}

const TOPIC_PREFIX: Record<TrackFamily, string> = {
	music: "music_topic_",
	support: "audio_topic_",
};

export function topicId(family: TrackFamily, slug: string) {
	return `${TOPIC_PREFIX[family]}${slug}`;
}

const TOPIC_PREFIXES = /^(?:music|audio)_topic_/;

/** `music_topic_sleep_rest` → `sleep_rest` */
export function topicSlug(id: string) {
	return id.replace(TOPIC_PREFIXES, "");
}
