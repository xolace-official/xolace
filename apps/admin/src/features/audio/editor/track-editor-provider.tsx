"use client";

import { createContext, type ReactNode, use, useState } from "react";
import { unsavedSince } from "@/features/content/draft-patch";
import {
	blockingGates,
	type PublishGate,
} from "@/features/content/publish-gate";
import { runAction } from "@/features/content/run-action";

import { type TrackPatch, useAudio } from "../audio-provider";
import { trackGates } from "../track-gates";
import type { AudioTopic, AudioTrack } from "../types";

/**
 * One track being edited: the saved track, the unsaved draft on top of it, and the gates
 * computed from the draft. Every editor part reads this instead of taking props, like
 * the entry editor.
 */
interface TrackEditorContextValue {
	actions: {
		discard: () => void;
		markSafetyReviewed: () => void;
		publish: () => void;
		replaceAudio: (durationSec: number) => void;
		replaceThumb: () => void;
		retire: () => void;
		retry: () => void;
		save: () => void;
		setField: <K extends keyof TrackPatch>(
			key: K,
			value: TrackPatch[K]
		) => void;
	};
	meta: {
		/** Publish is allowed: saved, and every required gate passes. */
		canPublish: boolean;
		dirty: boolean;
		now: number;
	};
	state: {
		blocking: readonly PublishGate[];
		gates: readonly PublishGate[];
		saved: AudioTrack;
		topics: readonly AudioTopic[];
		/** Saved track with the draft applied. */
		track: AudioTrack;
	};
}

const TrackEditorContext = createContext<TrackEditorContextValue | null>(null);

export function useTrackEditor() {
	const value = use(TrackEditorContext);
	if (!value) {
		throw new Error("useTrackEditor must be used inside TrackEditorProvider");
	}
	return value;
}

export function TrackEditorProvider({
	track: saved,
	children,
}: {
	track: AudioTrack;
	children: ReactNode;
}) {
	const audio = useAudio();
	const [patch, setPatch] = useState<TrackPatch>({});

	const track = { ...saved, ...patch };
	const dirty = Object.keys(patch).length > 0;
	const gates = trackGates(track);
	const blocking = blockingGates(gates);

	const value: TrackEditorContextValue = {
		actions: {
			discard: () => setPatch({}),
			markSafetyReviewed: () =>
				runAction(
					() => audio.actions.markSafetyReviewed(saved.slug),
					"Safety review recorded"
				),
			publish: () =>
				runAction(
					() => audio.actions.publish(saved.slug),
					`“${saved.title}” is live`
				),
			replaceAudio: (durationSec) =>
				runAction(
					() => audio.actions.replaceAudio(saved.slug, durationSec),
					"Audio replaced. It's processed when you publish."
				),
			replaceThumb: () =>
				runAction(
					() => audio.actions.replaceThumb(saved.slug),
					"Thumbnail replaced"
				),
			retire: () =>
				runAction(
					() => audio.actions.retire(saved.slug),
					`“${saved.title}” retired`
				),
			retry: () =>
				runAction(
					() => audio.actions.retry(saved.slug),
					"Processing ran again"
				),
			save: async () => {
				const submitted = patch;
				if (
					await runAction(
						() => audio.actions.save(saved.slug, submitted),
						"Saved"
					)
				) {
					setPatch((current) => unsavedSince(current, submitted));
				}
			},
			setField: (key, fieldValue) =>
				setPatch((current) => ({ ...current, [key]: fieldValue })),
		},
		meta: {
			canPublish:
				!dirty &&
				blocking.length === 0 &&
				saved.status !== "live" &&
				saved.status !== "failed" &&
				saved.status !== "processing",
			dirty,
			now: audio.meta.now,
		},
		state: {
			blocking,
			gates,
			saved,
			topics: audio.state.topics,
			track,
		},
	};

	return <TrackEditorContext value={value}>{children}</TrackEditorContext>;
}
