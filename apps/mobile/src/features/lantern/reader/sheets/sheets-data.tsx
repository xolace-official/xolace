import { createContext, type ReactNode, use } from "react";
import type { ReaderEntry } from "@/features/lantern/reader/reader-model";
import type { ReaderPage } from "@/features/lantern/reader/reading-modes";
import {
	useAppearanceSheet,
	useSourcesSheet,
	useTranscriptSheet,
} from "@/features/lantern/reader/sheets/use-sheets";
import type {
	ReadingPrefs,
	ReadingPrefsActions,
} from "@/features/lantern/reader/use-reading-prefs";

/** The Aa sheet: the reader's appearance, changed live under it. */
export type Appearance = { state: ReadingPrefs; actions: ReadingPrefsActions };

/** View sources: what an adapted read came from, on the reading page. */
export type Sources = {
	state: {
		page: ReaderPage;
		/** undefined while it loads. */
		sources: ReaderEntry["sources"] | undefined;
	};
};

/** The narration as text (Xolace+, never in the preview), on the reading page. */
export type Transcript = {
	state: {
		page: ReaderPage;
		/** undefined while it loads, null when there's none yet. */
		text: string | null | undefined;
	};
};

function sheetContext<T>(name: string) {
	const Context = createContext<T | null>(null);
	const Provider = ({ value, children }: { value: T; children: ReactNode }) => (
		<Context value={value}>{children}</Context>
	);
	const useValue = (): T => {
		const value = use(Context);
		if (!value) {
			throw new Error(`${name} needs its provider above it`);
		}
		return value;
	};
	return { Provider, useValue };
}

const appearance = sheetContext<Appearance>("useAppearance");
const sources = sheetContext<Sources>("useSources");
const transcript = sheetContext<Transcript>("useTranscript");

export const AppearanceProvider = appearance.Provider;
export const useAppearance = appearance.useValue;
export const SourcesProvider = sources.Provider;
export const useSources = sources.useValue;
export const TranscriptProvider = transcript.Provider;
export const useTranscript = transcript.useValue;

/** The apps' adapters: the store for the Aa sheet, Convex for the other two. */
export function AppearanceData({ children }: { children: ReactNode }) {
	return (
		<AppearanceProvider value={useAppearanceSheet()}>
			{children}
		</AppearanceProvider>
	);
}

export function SourcesData({
	slug,
	children,
}: {
	slug: string;
	children: ReactNode;
}) {
	return (
		<SourcesProvider value={useSourcesSheet(slug)}>{children}</SourcesProvider>
	);
}

export function TranscriptData({
	entryId,
	children,
}: {
	entryId: string;
	children: ReactNode;
}) {
	return (
		<TranscriptProvider value={useTranscriptSheet(entryId)}>
			{children}
		</TranscriptProvider>
	);
}
