import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

import type { ContentStatus } from "@/features/content/status-badge";

import { ENTRY_KINDS, type LibraryEntry } from "./types";

export const ENTRY_STATUSES = [
	"draft",
	"needs_review",
	"processing",
	"live",
	"failed",
	"retired",
] as const satisfies readonly ContentStatus[];

// `/library?kind=story&status=draft&q=exam`: a filtered view is a link.
const entryFilterParsers = {
	kind: parseAsStringLiteral(ENTRY_KINDS),
	q: parseAsString.withDefault(""),
	status: parseAsStringLiteral(ENTRY_STATUSES),
	subject: parseAsString,
};

export function useEntryFilters() {
	return useQueryStates(entryFilterParsers, { clearOnDefault: true });
}

export type EntryFilters = ReturnType<typeof useEntryFilters>[0];

export function filterEntries(
	entries: readonly LibraryEntry[],
	{ kind, q, status, subject }: EntryFilters
) {
	const needle = q.trim().toLowerCase();
	return entries.filter(
		(entry) =>
			(!kind || entry.kind === kind) &&
			(!status || entry.status === status) &&
			(!subject || entry.primarySubject === subject) &&
			(!needle ||
				`${entry.title} ${entry.dek} ${entry.slug}`
					.toLowerCase()
					.includes(needle))
	);
}
