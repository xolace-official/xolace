"use client";

import { api } from "@xolace/backend/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { createContext, type ReactNode, use, useState } from "react";

import { deriveStatus } from "@/features/content/derive-status";
import { UploadsPendingError } from "@/features/content/run-action";

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
	durationSec: number;
	family: TrackFamily;
	hasThumb: boolean;
	slug: string;
	title: string;
	topic: string;
}

/**
 * What every Audio screen reads and calls, implemented on `api.admin.audio`. Every
 * action can reject (Convex re-checks the publish gates), so editors run them through
 * `runAction`. Creating a track and replacing media need uploads (admin step 6b).
 */
export interface AudioContextValue {
	actions: {
		create: (track: NewTrack) => Promise<void>;
		markSafetyReviewed: (slug: string) => Promise<void>;
		publish: (slug: string) => Promise<void>;
		replaceAudio: (slug: string, durationSec: number) => Promise<void>;
		replaceThumb: (slug: string) => Promise<void>;
		replaceTopicCover: (slug: string) => Promise<void>;
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
		/** New tracks and media replacement arrive with R2 (admin step 6b). */
		uploads: boolean;
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

const uploadsPending = () => Promise.reject(new UploadsPendingError());

export function AudioProvider({ children }: { children: ReactNode }) {
	const [now] = useState(Date.now);
	// Skipped until Convex has the Clerk token (see LibraryProvider).
	const { isAuthenticated } = useConvexAuth();
	const args = isAuthenticated ? {} : "skip";
	const trackRows = useQuery(api.admin.audio.list, args);
	const topics = useQuery(api.admin.audio.topics, args);

	const saveTrack = useMutation(api.admin.audio.save);
	const publish = useMutation(api.admin.audio.publish);
	const retire = useMutation(api.admin.audio.retire);
	const markReviewed = useMutation(api.admin.audio.markSafetyReviewed);

	const tracks = trackRows?.map(toTrack) ?? EMPTY;

	const value: AudioContextValue = {
		actions: {
			create: uploadsPending,
			markSafetyReviewed: async (slug) => {
				await markReviewed({ slug });
			},
			publish: async (slug) => {
				await publish({ slug });
			},
			replaceAudio: uploadsPending,
			replaceThumb: uploadsPending,
			replaceTopicCover: uploadsPending,
			retire: async (slug) => {
				await retire({ slug });
			},
			// Processing failures arrive with uploads; until then nothing fails.
			retry: uploadsPending,
			save: async (slug, patch) => {
				const saved = tracks.find((track) => track.slug === slug);
				if (!saved) {
					throw new Error(`"${slug}" isn't loaded`);
				}
				const t = { ...saved, ...patch };
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
			uploads: false,
		},
		state: { topics: topics ?? EMPTY, tracks },
	};

	return <AudioContext value={value}>{children}</AudioContext>;
}
