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
import { openLink } from "@/features/lantern/reader/use-reader";
import { useReadingPrefs } from "@/features/lantern/reader/use-reading-prefs";

export const useAppearanceSheet = (): Appearance => useReadingPrefs();

export function useSourcesSheet(slug: string): Sources {
	const entry = useQuery(api.library.entries.getEntry, { slug });
	const { mode } = useReadingPrefs().state;
	return {
		actions: { openLink },
		state: {
			page: READING_MODES[mode].page,
			sources: entry?.sources ?? undefined,
		},
	};
}

/** Xolace+ only: the server refuses anyone else, so a free reader (an old link, or Plus lapsing
 * mid-listen) isn't asked and sees the "none" line. */
export function useTranscriptSheet(entryId: string): Transcript {
	const entitlement = useQuery(api.premium.getEntitlement);
	const plus = entitlement?.isPlus === true;
	const transcript = useQuery(
		api.library.audio.getTranscript,
		plus ? { entryId: entryId as Id<"library_entries"> } : "skip"
	);
	const text = entitlement === undefined ? undefined : plus ? transcript : null;
	const { mode } = useReadingPrefs().state;
	return { state: { page: READING_MODES[mode].page, text } };
}
