/**
 * The reader and its sheets on fixtures, under their providers through the same `{ state,
 * actions }` as the app. Taps change nothing and reach nothing, except the Aa sheet's, which
 * change it on screen; the narration is a still frame.
 */
import { useState } from "react";
import { card } from "@/features/lantern/dev/entries";
import { NIGHT, TRANSCRIPT } from "@/features/lantern/reader/dev/reads";
import {
	type Reader,
	ReaderProvider,
} from "@/features/lantern/reader/reader-data";
import type {
	ReaderEntry,
	ReaderState,
} from "@/features/lantern/reader/reader-model";
import { ReaderScreen } from "@/features/lantern/reader/reader-screen";
import { stepTextSize } from "@/features/lantern/reader/reading-modes";
import { AaSheet } from "@/features/lantern/reader/sheets/aa-sheet";
import {
	SourcesSheet,
	TranscriptSheet,
} from "@/features/lantern/reader/sheets/page-sheets";
import {
	AppearanceProvider,
	SourcesProvider,
	TranscriptProvider,
} from "@/features/lantern/reader/sheets/sheets-data";
import type { ReaderAudio } from "@/features/lantern/reader/use-entry-audio";
import type { ReadingPrefs } from "@/features/lantern/reader/use-reading-prefs";

const ignore = () => undefined;
const SECONDS = 60;

export const SIGNALS: ReaderState = {
	finished: false,
	helped: false,
	helpedCount: null,
	position: null,
	saved: false,
};
const IDLE: ReaderAudio = {
	currentTime: 0,
	duration: 0,
	failed: false,
	playing: false,
	preview: false,
	previewEnded: false,
	started: false,
	transcript: false,
};
/** The board's dock: 1:12 into a 7 minute listen, Xolace+. */
export const LISTENING: ReaderAudio = {
	...IDLE,
	currentTime: 72,
	duration: 7 * SECONDS,
	playing: true,
	started: true,
	transcript: true,
};
/** A free reader's 30 s preview, spent. */
export const PREVIEW_ENDED: ReaderAudio = {
	...IDLE,
	currentTime: 30,
	duration: 30,
	preview: true,
	previewEnded: true,
	started: true,
};
export const CLASSIC: ReadingPrefs = { fire: false, mode: "classic", size: 18 };

export function FixtureReader({
	entry = NIGHT,
	signals = SIGNALS,
	audio = IDLE,
	prefs = CLASSIC,
	opensAt = "place",
	startAt,
}: {
	entry?: ReaderEntry;
	signals?: ReaderState;
	audio?: ReaderAudio;
	prefs?: ReadingPrefs;
	opensAt?: Reader["state"]["opensAt"];
	startAt?: number;
}) {
	const value: Reader = {
		actions: {
			audio: {
				close: ignore,
				keepListening: ignore,
				openTranscript: ignore,
				skip: ignore,
				toggle: ignore,
			},
			leaveAt: ignore,
			openAppearance: ignore,
			openHelpline: ignore,
			openSources: ignore,
			reachEnd: ignore,
			reflect: ignore,
			resumed: ignore,
			share: ignore,
			toggleHelped: ignore,
			toggleSave: ignore,
		},
		state: {
			audio,
			entry,
			next: card("small-things"),
			opensAt,
			prefs,
			showHelpline: entry.kind === "explainer",
			signals,
		},
	};
	return (
		<ReaderProvider value={value}>
			<ReaderScreen startAt={startAt} />
		</ReaderProvider>
	);
}

/** The Aa sheet; its controls change it here, as they would the store. */
export function FixtureAppearance({
	initial = CLASSIC,
}: {
	initial?: ReadingPrefs;
}) {
	const [prefs, setPrefs] = useState(initial);
	return (
		<AppearanceProvider
			value={{
				actions: {
					setFire: (fire) => setPrefs((p) => ({ ...p, fire })),
					setMode: (mode) => setPrefs((p) => ({ ...p, mode })),
					stepSize: (by) =>
						setPrefs((p) => ({ ...p, size: stepTextSize(p.size, by) })),
				},
				state: prefs,
			}}
		>
			<AaSheet />
		</AppearanceProvider>
	);
}

export const FixtureSources = () => (
	<SourcesProvider value={{ state: { page: "app", sources: NIGHT.sources } }}>
		<SourcesSheet />
	</SourcesProvider>
);

export const FixtureTranscript = () => (
	<TranscriptProvider value={{ state: { page: "app", text: TRANSCRIPT } }}>
		<TranscriptSheet />
	</TranscriptProvider>
);
