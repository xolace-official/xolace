"use client";

import { createContext, type ReactNode, use, useState } from "react";
import { toast } from "sonner";

import {
	blockingGates,
	type PublishGate,
} from "@/features/content/publish-gate";

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
			markSafetyReviewed: () => {
				audio.actions.markSafetyReviewed(saved.slug);
				toast.success("Safety review recorded");
			},
			publish: () => {
				audio.actions.publish(saved.slug);
				toast.success(`“${saved.title}” is live`);
			},
			replaceAudio: (durationSec) => {
				audio.actions.replaceAudio(saved.slug, durationSec);
				toast.success("Audio replaced. It's processed when you publish.");
			},
			replaceThumb: () => {
				audio.actions.replaceThumb(saved.slug);
				toast.success("Thumbnail replaced");
			},
			retire: () => {
				audio.actions.retire(saved.slug);
				toast.success(`“${saved.title}” retired`);
			},
			retry: () => {
				audio.actions.retry(saved.slug);
				toast.success("Processing ran again (fixture)");
			},
			save: () => {
				audio.actions.save(saved.slug, patch);
				setPatch({});
				toast.success("Saved");
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
