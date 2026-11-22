import { type ReactNode, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { card } from "@/features/lantern/dev/entries";
import { NIGHT, TRANSCRIPT } from "@/features/lantern/reader/dev/reads";
import {
	type Reader,
	ReaderClockProvider,
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
import type {
	ReaderAudio,
	ReaderClock,
} from "@/features/lantern/reader/use-entry-audio";
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
type FixtureAudio = ReaderAudio & ReaderClock;
const IDLE: FixtureAudio = {
	currentTime: 0,
	duration: 0,
	failed: false,
	playing: false,
	preview: false,
	previewEnded: false,
	started: false,
	transcript: false,
};
export const LISTENING: FixtureAudio = {
	...IDLE,
	currentTime: 72,
	duration: 7 * SECONDS,
	playing: true,
	started: true,
	transcript: true,
};
export const PREVIEW_ENDED: FixtureAudio = {
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
	audio?: FixtureAudio;
	prefs?: ReadingPrefs;
	opensAt?: Reader["state"]["opensAt"];
	startAt?: number;
}) {
	const { currentTime, duration, ...shown } = audio;
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
			openLink: ignore,
			openSources: ignore,
			reachEnd: ignore,
			reflect: ignore,
			resumed: ignore,
			share: ignore,
			toggleHelped: ignore,
			toggleSave: ignore,
		},
		state: {
			audio: shown,
			entry,
			next: card("small-things"),
			opensAt,
			prefs,
			showHelpline: entry.kind === "explainer",
			signals,
		},
	};
	return (
		<ReaderClockProvider value={{ currentTime, duration }}>
			<ReaderProvider value={value}>
				<ReaderScreen startAt={startAt} />
			</ReaderProvider>
		</ReaderClockProvider>
	);
}

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
			<AsSheet>
				<AaSheet />
			</AsSheet>
		</AppearanceProvider>
	);
}

export const FixtureSources = ({
	sources = NIGHT.sources,
}: {
	sources?: ReaderEntry["sources"];
}) => (
	<SourcesProvider
		value={{
			actions: { openLink: ignore },
			state: { page: "app", sources },
		}}
	>
		<AsSheet>
			<SourcesSheet />
		</AsSheet>
	</SourcesProvider>
);

export const FixtureTranscript = () => (
	<TranscriptProvider value={{ state: { page: "app", text: TRANSCRIPT } }}>
		<AsSheet>
			<TranscriptSheet />
		</AsSheet>
	</TranscriptProvider>
);

function AsSheet({ children }: { children: ReactNode }) {
	const { top } = useSafeAreaInsets();
	return (
		<View className="flex-1 bg-surface" style={{ paddingTop: top }}>
			{children}
		</View>
	);
}
