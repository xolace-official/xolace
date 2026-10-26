"use client";

import { api } from "@xolace/backend/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { createContext, type ReactNode, use, useState } from "react";

import { deriveStatus } from "@/features/content/derive-status";
import { useHeldLinks, useLinkWindow } from "@/features/media/link-window";
import { useMediaUpload } from "@/features/media/use-media-upload";

import { trackGates } from "./track-gates";
import type { AudioTopic, AudioTrack, TrackFamily } from "./types";

/** Fields an editor can change from the track screen. */
export type TrackPatch = Partial<
	Pick<
		AudioTrack,
		| "featured"
		| "licence"
		| "narrators"
		| "newUntil"
		| "tags"
		| "tier"
		| "title"
		| "topic"
		| "transcript"
		| "whatItsFor"
	>
>;

/** What New track collects before the editor opens. */
export interface NewTrack {
	audio: File;
	durationSec: number;
	family: TrackFamily;
	slug: string;
	thumb: File;
	title: string;
	topic: string;
}

/**
 * What every Audio screen reads and calls, implemented on `api.admin.audio`. Every
 * action can reject (Convex re-checks the publish gates), so editors run them through
 * `runAction`. Media actions upload to R2 first, then point the row at it.
 */
export interface AudioContextValue {
	actions: {
		create: (track: NewTrack) => Promise<void>;
		markSafetyReviewed: (slug: string) => Promise<void>;
		publish: (slug: string) => Promise<void>;
		replaceAudio: (
			slug: string,
			file: File,
			durationSec: number
		) => Promise<void>;
		replaceThumb: (slug: string, file: File) => Promise<void>;
		replaceTopicCover: (slug: string, file: File) => Promise<void>;
		retire: (slug: string) => Promise<void>;
		retry: (slug: string) => Promise<void>;
		save: (slug: string, patch: TrackPatch) => Promise<void>;
	};
	meta: {
		backend: "convex";
		/** Taken once per mount, so "New" badges don't re-run on a clock. */
		now: number;
		/** Every list has arrived; until then the lists are empty. */
		ready: boolean;
	};
	state: {
		topics: readonly AudioTopic[];
		tracks: readonly AudioTrack[];
	};
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function useAudio() {
	const value = use(AudioContext);
	if (!value) {
		throw new Error("useAudio must be used inside AudioProvider");
	}
	return value;
}

type TrackRow = FunctionReturnType<typeof api.admin.audio.list>[number];

function toTrack(row: TrackRow): AudioTrack {
	const { editedBy: _editedBy, retiredAt: _retiredAt, ...fields } = row;
	// Every stored track has its thumbnail: `thumbKey` is required on the row.
	const track: AudioTrack = { ...fields, hasThumb: true, status: "draft" };
	return {
		...track,
		status: deriveStatus(row, trackGates(track), ["safety"]),
	};
}

const EMPTY: readonly never[] = [];

/** Signed links to a track's audio and thumbnail; `undefined` while loading. */
export function useTrackMedia(slug: string) {
	const { isAuthenticated } = useConvexAuth();
	const linkWindow = useLinkWindow();
	return useHeldLinks(
		useQuery(
			api.admin.audio.media,
			isAuthenticated ? { linkWindow, slug } : "skip"
		),
		slug
	);
}

export function AudioProvider({ children }: { children: ReactNode }) {
	const [now] = useState(Date.now);
	// Skipped until Convex has the Clerk token (see LibraryProvider).
	const { isAuthenticated } = useConvexAuth();
	const linkWindow = useLinkWindow();
	const trackRows = useQuery(
		api.admin.audio.list,
		isAuthenticated ? {} : "skip"
	);
	const topics = useHeldLinks(
		useQuery(api.admin.audio.topics, isAuthenticated ? { linkWindow } : "skip")
	);

	const saveTrack = useMutation(api.admin.audio.save);
	const publish = useMutation(api.admin.audio.publish);
	const retire = useMutation(api.admin.audio.retire);
	const markReviewed = useMutation(api.admin.audio.markSafetyReviewed);
	const createTrack = useMutation(api.admin.audio.create);
	const replaceAudio = useMutation(api.admin.audio.replaceAudio);
	const replaceThumb = useMutation(api.admin.audio.replaceThumb);
	const replaceTopicCover = useMutation(api.admin.audio.replaceTopicCover);
	const upload = useMediaUpload();

	const tracks = trackRows?.map(toTrack) ?? EMPTY;
	const find = (slug: string) => {
		const track = tracks.find((t) => t.slug === slug);
		if (!track) {
			throw new Error(`"${slug}" isn't loaded`);
		}
		return track;
	};

	const value: AudioContextValue = {
		actions: {
			create: async ({ audio, durationSec, family, slug, thumb, ...rest }) => {
				// Thumbnail first, as the ingest does: a failed audio upload leaves no orphan.
				const uploadedThumb = await upload.image(thumb, "thumb");
				await upload.audio(audio, { family, slug }, (uploaded) =>
					createTrack({
						...rest,
						audio: { ...uploaded, durationSec },
						family,
						slug,
						thumb: uploadedThumb,
					})
				);
			},
			markSafetyReviewed: async (slug) => {
				await markReviewed({ slug });
			},
			publish: async (slug) => {
				await publish({ slug });
			},
			replaceAudio: async (slug, file, durationSec) => {
				const { family } = find(slug);
				await upload.audio(file, { family, slug }, (uploaded) =>
					replaceAudio({ ...uploaded, durationSec, slug })
				);
			},
			replaceThumb: async (slug, file) => {
				await replaceThumb({ slug, thumb: await upload.image(file, "thumb") });
			},
			replaceTopicCover: async (slug, file) => {
				await replaceTopicCover({
					slug,
					thumb: await upload.image(file, "thumb"),
				});
			},
			retire: async (slug) => {
				await retire({ slug });
			},
			// Media is processed before it's saved, so nothing fails until imports (step 6c).
			retry: () =>
				Promise.reject(
					new Error("Retry arrives with imports (admin step 6c).")
				),
			save: async (slug, patch) => {
				const t = { ...find(slug), ...patch };
				const support = t.family === "support";
				await saveTrack({
					slug,
					track: {
						featured: t.featured,
						licence: support ? undefined : t.licence,
						narrators: support && t.narrators?.length ? t.narrators : undefined,
						newUntil: t.newUntil,
						tags: t.tags,
						tier: support ? t.tier : undefined,
						title: t.title,
						topic: t.topic,
						transcript: (support && t.transcript) || undefined,
						whatItsFor: (!support && t.whatItsFor) || undefined,
					},
				});
			},
		},
		meta: {
			backend: "convex",
			now,
			ready: trackRows !== undefined && topics !== undefined,
		},
		state: { topics: topics ?? EMPTY, tracks },
	};

	return <AudioContext value={value}>{children}</AudioContext>;
}
