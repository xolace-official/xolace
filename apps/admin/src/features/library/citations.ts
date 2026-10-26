import type { EntryCredit, LibraryEntry, LibrarySource } from "./types";

const DAY_MS = 86_400_000;

/** One place an entry credits a source. */
export interface Citation {
	credit: EntryCredit;
	entry: LibraryEntry;
	/** Past the source's `refreshDays` since the page was last retrieved. */
	stale: boolean;
}

/** Days since the credit's page was retrieved, or null when we don't know. */
export function daysSinceRetrieved(
	credit: EntryCredit,
	entry: LibraryEntry,
	now: number
) {
	const retrieved = credit.retrievedAt ?? entry.retrievedAt;
	return retrieved === undefined
		? null
		: Math.floor((now - retrieved) / DAY_MS);
}

export function isStale(
	credit: EntryCredit,
	entry: LibraryEntry,
	source: LibrarySource | undefined,
	now: number
) {
	const days = daysSinceRetrieved(credit, entry, now);
	return Boolean(
		source?.refreshDays && days !== null && days > source.refreshDays
	);
}

/** Every credit pointing at `source`, entry by entry, in list order. */
export function citationsOf(
	source: LibrarySource,
	entries: readonly LibraryEntry[],
	now: number
): Citation[] {
	return entries.flatMap((entry) =>
		entry.credits
			.filter((credit) => credit.source === source.slug)
			.map((credit) => ({
				credit,
				entry,
				stale: isStale(credit, entry, source, now),
			}))
	);
}
