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

export type Appearance = { state: ReadingPrefs; actions: ReadingPrefsActions };

export type Sources = {
	state: {
		page: ReaderPage;
		sources: ReaderEntry["sources"] | undefined;
	};
	actions: { openLink: (url: string) => void };
};

export type Transcript = {
	state: {
		page: ReaderPage;
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
