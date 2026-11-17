/** The reader sheets' data hooks: the appearance in the store, sources and transcript on Convex. */
import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import { useQuery } from "convex/react";
import { READING_MODES } from "@/features/lantern/reader/reading-modes";
import type {
	Appearance,
	Sources,
	Transcript,
} from "@/features/lantern/reader/sheets/sheets-data";
import { useReadingPrefs } from "@/features/lantern/reader/use-reading-prefs";

export const useAppearanceSheet = (): Appearance => useReadingPrefs();

export function useSourcesSheet(slug: string): Sources {
	const entry = useQuery(api.library.entries.getEntry, { slug });
	const { mode } = useReadingPrefs().state;
	return {
		state: {
			page: READING_MODES[mode].page,
			sources: entry?.sources ?? undefined,
		},
	};
}

export function useTranscriptSheet(entryId: string): Transcript {
	const text = useQuery(api.library.audio.getTranscript, {
		entryId: entryId as Id<"library_entries">,
	});
	const { mode } = useReadingPrefs().state;
	return { state: { page: READING_MODES[mode].page, text } };
}
