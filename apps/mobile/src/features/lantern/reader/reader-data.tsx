import { createContext, type ReactNode, use } from "react";
import type {
	NextEntry,
	ReaderEntry,
	ReaderState,
} from "@/features/lantern/reader/reader-model";
import {
	ReaderGone,
	ReaderSkeleton,
} from "@/features/lantern/reader/reader-skeleton";
import type {
	ReaderAudio,
	ReaderAudioActions,
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
		<Loaded entry={entry} showHelpline={showHelpline}>
			{children}
		</Loaded>
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
	return (
		<ReaderProvider value={useReader(entry, { showHelpline })}>
			{children}
		</ReaderProvider>
	);
}

export function useReaderScreen(): Reader {
	const value = use(ReaderContext);
	if (!value) {
		throw new Error("useReaderScreen needs a ReaderProvider above it");
	}
	return value;
}
