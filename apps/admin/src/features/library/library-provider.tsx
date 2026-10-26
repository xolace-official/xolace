"use client";

import { createContext, type ReactNode, use, useState } from "react";

import { FIXTURE_BODIES } from "./fixture-bodies";
import { FIXTURE_ENTRIES, FIXTURE_HUBS, FIXTURE_SOURCES } from "./fixtures";
import type {
	EntryKind,
	LibraryEntry,
	LibraryHub,
	LibrarySource,
} from "./types";

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

/** What New entry collects before the editor opens. */
export interface NewEntry {
	kind: EntryKind;
	primarySubject: string;
	slug: string;
	title: string;
}

/** Fields an editor can change from the hub screen. */
export type HubPatch = Partial<Pick<LibraryHub, "intro" | "items" | "title">>;

/** What New hub collects before the editor opens. */
export interface NewHub {
	slug: string;
	title: string;
}

/** Everything about a source is editable except its slug, which credits point at. */
export type SourcePatch = Partial<Omit<LibrarySource, "slug">>;

/**
 * What every Library screen reads and calls. The fixture provider below implements it
 * in memory; the Convex provider (admin step 6) implements it with `api.admin.library.*`
 * and the screens don't change.
 */
export interface LibraryContextValue {
	actions: {
		create: (entry: NewEntry) => void;
		createHub: (hub: NewHub) => void;
		createSource: (source: LibrarySource) => void;
		markSafetyReviewed: (slug: string) => void;
		publish: (slug: string) => void;
		publishHub: (slug: string) => void;
		recordConsent: (slug: string) => void;
		replaceHubCover: (slug: string) => void;
		retire: (slug: string) => void;
		retireHub: (slug: string) => void;
		save: (slug: string, patch: EntryPatch, body?: string) => void;
		saveHub: (slug: string, patch: HubPatch) => void;
		saveSource: (slug: string, patch: SourcePatch) => void;
	};
	meta: {
		backend: "fixtures" | "convex";
		/** Taken once per mount, so gate checks don't re-run on a clock. */
		now: number;
	};
	state: {
		bodies: Readonly<Record<string, string>>;
		entries: readonly LibraryEntry[];
		hubs: readonly LibraryHub[];
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
	const [hubs, setHubs] = useState(FIXTURE_HUBS);
	const [sources, setSources] = useState(FIXTURE_SOURCES);
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

	const updateHub = (slug: string, change: (hub: LibraryHub) => LibraryHub) =>
		setHubs((current) =>
			current.map((hub) =>
				hub.slug === slug ? { ...change(hub), updatedAt: Date.now() } : hub
			)
		);

	// Clearing a gate moves a blocked entry back to draft; it never publishes.
	const unblock = (entry: LibraryEntry) =>
		entry.status === "needs_review"
			? { ...entry, status: "draft" as const }
			: entry;

	const value: LibraryContextValue = {
		actions: {
			create: (entry) => {
				const createdAt = Date.now();
				setEntries((current) => [
					{
						...entry,
						active: false,
						credits: [],
						dek: "",
						facets: {},
						hasCover: false,
						lastReviewedAt: createdAt,
						readMin: 0,
						// Stories are first-person accounts; the rest start as our own adaptation.
						reuse: entry.kind === "story" ? "original" : "adapted",
						status: "draft",
						updatedAt: createdAt,
					},
					...current,
				]);
				setBodies((current) => ({ ...current, [entry.slug]: "" }));
			},
			createHub: (hub) =>
				setHubs((current) => [
					...current,
					{
						...hub,
						active: false,
						hasCover: false,
						intro: "",
						items: [],
						status: "draft",
						updatedAt: Date.now(),
					},
				]),
			createSource: (source) => setSources((current) => [...current, source]),
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
			publishHub: (slug) =>
				updateHub(slug, (hub) => ({ ...hub, active: true, status: "live" })),
			recordConsent: (slug) =>
				update(slug, (entry) =>
					unblock({ ...entry, consentRecordedAt: Date.now() })
				),
			replaceHubCover: (slug) =>
				updateHub(slug, (hub) => ({ ...hub, hasCover: true })),
			retire: (slug) =>
				update(slug, (entry) => ({
					...entry,
					active: false,
					status: "retired",
				})),
			retireHub: (slug) =>
				updateHub(slug, (hub) => ({
					...hub,
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
			saveHub: (slug, patch) =>
				updateHub(slug, (hub) => ({ ...hub, ...patch })),
			saveSource: (slug, patch) =>
				setSources((current) =>
					current.map((source) =>
						source.slug === slug ? { ...source, ...patch } : source
					)
				),
		},
		meta: { backend: "fixtures", now },
		state: { bodies, entries, hubs, sources },
	};

	return <LibraryContext value={value}>{children}</LibraryContext>;
}
