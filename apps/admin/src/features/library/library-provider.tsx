"use client";

import { createContext, type ReactNode, use, useState } from "react";

import { FIXTURE_BODIES } from "./fixture-bodies";
import { FIXTURE_ENTRIES, FIXTURE_SOURCES } from "./fixtures";
import type { LibraryEntry, LibrarySource } from "./types";

/** Fields an editor can change from the entry screen. */
export type EntryPatch = Partial<
	Pick<
		LibraryEntry,
		| "contentNote"
		| "credits"
		| "dek"
		| "facets"
		| "primarySubject"
		| "reflectPrompt"
		| "storyDescriptor"
		| "title"
	>
>;

/**
 * What every Library screen reads and calls. The fixture provider below implements it
 * in memory; the Convex provider (admin step 6) implements it with `api.admin.library.*`
 * and the screens don't change.
 */
export interface LibraryContextValue {
	actions: {
		markSafetyReviewed: (slug: string) => void;
		publish: (slug: string) => void;
		recordConsent: (slug: string) => void;
		retire: (slug: string) => void;
		save: (slug: string, patch: EntryPatch, body?: string) => void;
	};
	meta: {
		backend: "fixtures" | "convex";
		/** Taken once per mount, so gate checks don't re-run on a clock. */
		now: number;
	};
	state: {
		bodies: Readonly<Record<string, string>>;
		entries: readonly LibraryEntry[];
		sources: readonly LibrarySource[];
	};
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function useLibrary() {
	const value = use(LibraryContext);
	if (!value) {
		throw new Error("useLibrary must be used inside a Library provider");
	}
	return value;
}

/** In-memory Library over the prod manifest fixtures. Edits last until reload. */
export function LibraryFixtureProvider({ children }: { children: ReactNode }) {
	const [entries, setEntries] = useState(FIXTURE_ENTRIES);
	const [bodies, setBodies] = useState(FIXTURE_BODIES);
	const [now] = useState(Date.now);

	const update = (
		slug: string,
		change: (entry: LibraryEntry) => LibraryEntry
	) =>
		setEntries((current) =>
			current.map((entry) =>
				entry.slug === slug
					? { ...change(entry), updatedAt: Date.now() }
					: entry
			)
		);

	// Clearing a gate moves a blocked entry back to draft; it never publishes.
	const unblock = (entry: LibraryEntry) =>
		entry.status === "needs_review"
			? { ...entry, status: "draft" as const }
			: entry;

	const value: LibraryContextValue = {
		actions: {
			markSafetyReviewed: (slug) =>
				update(slug, (entry) =>
					unblock({ ...entry, safetyReviewedAt: Date.now() })
				),
			publish: (slug) =>
				update(slug, (entry) => ({
					...entry,
					active: true,
					publishedAt: entry.publishedAt ?? Date.now(),
					status: "live",
				})),
			recordConsent: (slug) =>
				update(slug, (entry) =>
					unblock({ ...entry, consentRecordedAt: Date.now() })
				),
			retire: (slug) =>
				update(slug, (entry) => ({
					...entry,
					active: false,
					status: "retired",
				})),
			save: (slug, patch, body) => {
				const bodyChanged = body !== undefined && body !== bodies[slug];
				if (bodyChanged) {
					setBodies((current) => ({ ...current, [slug]: body }));
				}
				update(slug, (entry) => ({
					...entry,
					...patch,
					// The safety review covers one body; a new body needs a new review.
					safetyReviewedAt: bodyChanged ? undefined : entry.safetyReviewedAt,
				}));
			},
		},
		meta: { backend: "fixtures", now },
		state: { bodies, entries, sources: FIXTURE_SOURCES },
	};

	return <LibraryContext value={value}>{children}</LibraryContext>;
}
