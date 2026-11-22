import { createContext, type ReactNode, use, useMemo } from "react";
import type {
	NextEntry,
	ReaderEntry,
	ReaderState,
} from "@/features/lantern/reader/reader-model";
import {
	ReaderGone,
	ReaderSkeleton,
} from "@/features/lantern/reader/reader-skeleton";
import {
	type ReaderAudio,
	type ReaderAudioActions,
	type ReaderClock,
	useEntryAudio,
} from "@/features/lantern/reader/use-entry-audio";
import {
	useReader,
	useReaderEntry,
} from "@/features/lantern/reader/use-reader";
import type { ReadingPrefs } from "@/features/lantern/reader/use-reading-prefs";
import type { EntryRef } from "@/features/lantern/use-entry-actions";

export type Reader = {
	state: {
		entry: ReaderEntry;
		signals: ReaderState | undefined;
		next: NextEntry | null | undefined;
		audio: ReaderAudio;
		prefs: ReadingPrefs;
		opensAt: "place" | "top";
		showHelpline: boolean;
		hub?: string;
	};
	actions: {
		toggleSave: () => void;
		share: (entry?: EntryRef) => void;
		toggleHelped: () => void;
		reflect: () => void;
		openHelpline: () => void;
		openSources: () => void;
		openAppearance: () => void;
		openLink: (url: string) => void;
		reachEnd: () => void;
		leaveAt: (share: number | null) => void;
		resumed: () => void;
		audio: ReaderAudioActions;
	};
};

const ReaderContext = createContext<Reader | null>(null);
const ClockContext = createContext<ReaderClock>({
	currentTime: 0,
	duration: 0,
});
type EntryAudio = { state: ReaderAudio; actions: ReaderAudioActions };
const EntryAudioContext = createContext<EntryAudio | null>(null);

export const ReaderClockProvider = ClockContext;

export function ReaderProvider({
	value,
	children,
}: {
	value: Reader;
	children: ReactNode;
}) {
	return <ReaderContext value={value}>{children}</ReaderContext>;
}

export function ReaderData({
	slug,
	showHelpline,
	children,
}: {
	slug: string;
	showHelpline: boolean;
	children: ReactNode;
}) {
	const entry = useReaderEntry(slug);
	if (entry === undefined) {
		return <ReaderSkeleton />;
	}
	if (entry === null) {
		return <ReaderGone />;
	}
	return (
		<AudioHost entry={entry}>
			<Loaded entry={entry} showHelpline={showHelpline}>
				{children}
			</Loaded>
		</AudioHost>
	);
}

function AudioHost({
	entry,
	children,
}: {
	entry: ReaderEntry;
	children: ReactNode;
}) {
	const audio = useEntryAudio(entry._id, entry.slug, !!entry.listenMin);
	const { actions } = audio;
	const { failed, playing, preview, previewEnded, started, transcript } =
		audio.state;
	const { currentTime, duration } = audio.clock;
	const value = useMemo(
		() => ({
			actions,
			state: { failed, playing, preview, previewEnded, started, transcript },
		}),
		[actions, failed, playing, preview, previewEnded, started, transcript]
	);
	const clock = useMemo(
		() => ({ currentTime, duration }),
		[currentTime, duration]
	);
	return (
		<ClockContext value={clock}>
			<EntryAudioContext value={value}>{children}</EntryAudioContext>
		</ClockContext>
	);
}

function Loaded({
	entry,
	showHelpline,
	children,
}: {
	entry: ReaderEntry;
	showHelpline: boolean;
	children: ReactNode;
}) {
	const audio = use(EntryAudioContext);
	if (!audio) {
		throw new Error("The reader's audio host is missing");
	}
	return (
		<ReaderProvider value={useReader(entry, { audio, showHelpline })}>
			{children}
		</ReaderProvider>
	);
}

export const useReaderClock = () => use(ClockContext);

export function useReaderScreen(): Reader {
	const value = use(ReaderContext);
	if (!value) {
		throw new Error("useReaderScreen needs a ReaderProvider above it");
	}
	return value;
}
