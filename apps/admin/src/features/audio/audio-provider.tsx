"use client";

import { createContext, type ReactNode, use, useState } from "react";

import { FIXTURE_TOPICS, FIXTURE_TRACKS } from "./fixtures";
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
 * What every Audio screen reads and calls. The fixture provider below implements it
 * in memory; the Convex provider (admin step 6) implements it with `api.admin.audio.*`
 * and the screens don't change.
 */
export interface AudioContextValue {
	actions: {
		create: (track: NewTrack) => void;
		markSafetyReviewed: (slug: string) => void;
		publish: (slug: string) => void;
		replaceAudio: (slug: string, durationSec: number) => void;
		replaceThumb: (slug: string) => void;
		replaceTopicCover: (slug: string) => void;
		retire: (slug: string) => void;
		retry: (slug: string) => void;
		save: (slug: string, patch: TrackPatch) => void;
	};
	meta: {
		backend: "fixtures" | "convex";
		/** Taken once per mount, so "New" badges don't re-run on a clock. */
		now: number;
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
		throw new Error("useAudio must be used inside an Audio provider");
	}
	return value;
}

/** In-memory Audio over the prod kindling fixtures. Edits last until reload. */
export function AudioFixtureProvider({ children }: { children: ReactNode }) {
	const [tracks, setTracks] = useState(FIXTURE_TRACKS);
	const [topics, setTopics] = useState(FIXTURE_TOPICS);
	const [now] = useState(Date.now);

	const update = (slug: string, change: (track: AudioTrack) => AudioTrack) =>
		setTracks((current) =>
			current.map((track) =>
				track.slug === slug
					? { ...change(track), updatedAt: Date.now() }
					: track
			)
		);

	const value: AudioContextValue = {
		actions: {
			create: (track) =>
				setTracks((current) => [
					{
						...track,
						active: false,
						featured: false,
						sourceTags: [],
						status: "draft",
						tags: [],
						updatedAt: Date.now(),
					},
					...current,
				]),
			markSafetyReviewed: (slug) =>
				update(slug, (track) => ({
					...track,
					safetyReviewedAt: Date.now(),
					status: track.status === "needs_review" ? "draft" : track.status,
				})),
			publish: (slug) =>
				update(slug, (track) => ({ ...track, active: true, status: "live" })),
			replaceAudio: (slug, durationSec) =>
				update(slug, (track) => ({ ...track, durationSec })),
			replaceThumb: (slug) =>
				update(slug, (track) => ({ ...track, hasThumb: true })),
			replaceTopicCover: (slug) =>
				setTopics((current) =>
					current.map((topic) =>
						topic.slug === slug ? { ...topic, hasCover: true } : topic
					)
				),
			retire: (slug) =>
				update(slug, (track) => ({
					...track,
					active: false,
					status: "retired",
				})),
			// Fixture retry: the step "runs" and succeeds as a draft.
			retry: (slug) =>
				update(slug, (track) => ({
					...track,
					failure: undefined,
					status: "draft",
				})),
			save: (slug, patch) => update(slug, (track) => ({ ...track, ...patch })),
		},
		meta: { backend: "fixtures", now },
		state: { topics, tracks },
	};

	return <AudioContext value={value}>{children}</AudioContext>;
}
