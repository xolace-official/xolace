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

/**
 * Everything the reader reads and does. Two adapters fill it: Convex in the app (`ReaderData`)
 * and fixtures in its dev states. No part calls Convex, PostHog or the toast itself.
 */
export type Reader = {
	state: {
		entry: ReaderEntry;
		/** This reader's own row; undefined while it loads. */
		signals: ReaderState | undefined;
		/** Up next; null when nothing qualifies, undefined while it loads. */
		next: NextEntry | null | undefined;
		audio: ReaderAudio;
		prefs: ReadingPrefs;
		/** Where a read with a stored place opens (lantern.md §5.3). */
		opensAt: "place" | "top";
		/** Explainers end on a way to support, where there are resources nearby. */
		showHelpline: boolean;
		/** Opened from a hub: Up next follows its order. */
		hub?: string;
	};
	actions: {
		toggleSave: () => void;
		/** This read, or another (Up next's menu). */
		share: (entry?: EntryRef) => void;
		toggleHelped: () => void;
		reflect: () => void;
		openHelpline: () => void;
		openSources: () => void;
		openAppearance: () => void;
		/** A link in the body or the credit; says so when it can't open. */
		openLink: (url: string) => void;
		/** The reader reached the end of the article (Finished waits on its dwell). */
		reachEnd: () => void;
		/** Leaving: the read share to keep, or null to keep the old place. */
		leaveAt: (share: number | null) => void;
		/** "Pick up at 40%" or the title's Resume action. */
		resumed: () => void;
		audio: ReaderAudioActions;
	};
};

const ReaderContext = createContext<Reader | null>(null);
/** Apart from the reader's own: it ticks while the narration plays. */
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

/**
 * The app's adapter. While the entry loads, its skeleton; once it's gone from Lantern, a quiet
 * line. `showHelpline`: the route knows whether there are crisis resources nearby.
 */
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

/**
 * The narration, above the reader: a status tick re-renders this and the clock's readers (the
 * dock's time), while `children`, made by the parent, stay as they are unless the rarely changing
 * part (started, playing…) does.
 */
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

/** The narration's time, for the dock alone. */
export const useReaderClock = () => use(ClockContext);

export function useReaderScreen(): Reader {
	const value = use(ReaderContext);
	if (!value) {
		throw new Error("useReaderScreen needs a ReaderProvider above it");
	}
	return value;
}
