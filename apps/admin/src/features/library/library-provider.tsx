"use client";

import { api } from "@xolace/backend/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { createContext, type ReactNode, use, useState } from "react";

import { deriveStatus } from "@/features/content/derive-status";
import { UploadsPendingError } from "@/features/content/run-action";

import { publishGates } from "./publish-gates";
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
 * What every Library screen reads and calls, implemented on `api.admin.library`,
 * `api.admin.hubs` and `api.admin.sources`. Every action can reject: Convex re-checks
 * the publish gates, so editors run them through `runAction`.
 */
export interface LibraryContextValue {
	actions: {
		create: (entry: NewEntry) => Promise<void>;
		createHub: (hub: NewHub) => Promise<void>;
		createSource: (source: LibrarySource) => Promise<void>;
		markSafetyReviewed: (slug: string) => Promise<void>;
		publish: (slug: string) => Promise<void>;
		publishHub: (slug: string) => Promise<void>;
		recordConsent: (slug: string) => Promise<void>;
		replaceHubCover: (slug: string) => Promise<void>;
		retire: (slug: string) => Promise<void>;
		retireHub: (slug: string) => Promise<void>;
		save: (slug: string, patch: EntryPatch, body?: string) => Promise<void>;
		saveHub: (slug: string, patch: HubPatch) => Promise<void>;
		saveSource: (slug: string, patch: SourcePatch) => Promise<void>;
	};
	meta: {
		backend: "convex";
		/** Taken once per mount, so gate checks don't re-run on a clock. */
		now: number;
		/** Every list has arrived; until then the lists are empty. */
		ready: boolean;
		/** Cover uploads arrive with R2 (admin step 6b). */
		uploads: boolean;
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
		throw new Error("useLibrary must be used inside LibraryProvider");
	}
	return value;
}

// What blocks an entry for review, rather than for being unfinished.
const REVIEW_GATES = ["alt", "consent", "safety"];

type EntryRow = FunctionReturnType<typeof api.admin.library.list>[number];
type HubRow = FunctionReturnType<typeof api.admin.hubs.list>[number];
type SourceRow = FunctionReturnType<typeof api.admin.sources.list>[number];

function toEntry(
	row: EntryRow,
	body: string,
	sources: readonly LibrarySource[],
	now: number
): LibraryEntry {
	const {
		editedBy: _editedBy,
		narration,
		retiredAt: _retiredAt,
		...fields
	} = row;
	const entry: LibraryEntry = {
		...fields,
		narration: narration && {
			durationSec: narration.durationSec,
			hasTranscript: narration.hasTranscript,
			status: narration.active ? "live" : "retired",
		},
		status: "draft",
	};
	const gates = publishGates({ body, entry, now, sources });
	return { ...entry, status: deriveStatus(row, gates, REVIEW_GATES) };
}

function toHub(row: HubRow): LibraryHub {
	const { editedBy: _editedBy, retiredAt: _retiredAt, ...hub } = row;
	return { ...hub, status: deriveStatus(row) };
}

function toSource(row: SourceRow): LibrarySource {
	const { editedBy: _editedBy, updatedAt: _updatedAt, ...source } = row;
	return source;
}

const EMPTY: readonly never[] = [];

export function LibraryProvider({ children }: { children: ReactNode }) {
	const [now] = useState(Date.now);
	// Admin queries reject a call without a token, and Clerk hands Convex one only
	// after mount; until then, skip rather than fail.
	const { isAuthenticated } = useConvexAuth();
	const args = isAuthenticated ? {} : "skip";
	const entryRows = useQuery(api.admin.library.list, args);
	const bodies = useQuery(api.admin.library.bodies, args);
	const hubRows = useQuery(api.admin.hubs.list, args);
	const sourceRows = useQuery(api.admin.sources.list, args);

	const createEntry = useMutation(api.admin.library.create);
	const saveEntry = useMutation(api.admin.library.save);
	const publishEntry = useMutation(api.admin.library.publish);
	const retireEntry = useMutation(api.admin.library.retire);
	const markReviewed = useMutation(api.admin.library.markSafetyReviewed);
	const recordConsent = useMutation(api.admin.library.recordConsent);
	const createHub = useMutation(api.admin.hubs.create);
	const saveHub = useMutation(api.admin.hubs.save);
	const publishHub = useMutation(api.admin.hubs.publish);
	const retireHub = useMutation(api.admin.hubs.retire);
	const createSource = useMutation(api.admin.sources.create);
	const saveSource = useMutation(api.admin.sources.save);

	const sources = sourceRows?.map(toSource) ?? EMPTY;
	const entries =
		entryRows?.map((row) =>
			toEntry(row, bodies?.[row.slug] ?? "", sources, now)
		) ?? EMPTY;
	const hubs = hubRows?.map(toHub) ?? EMPTY;
	const ready = [entryRows, bodies, hubRows, sourceRows].every(
		(q) => q !== undefined
	);

	const find = <T extends { slug: string }>(
		list: readonly T[],
		slug: string
	) => {
		const item = list.find((x) => x.slug === slug);
		if (!item) {
			throw new Error(`"${slug}" isn't loaded`);
		}
		return item;
	};

	const value: LibraryContextValue = {
		actions: {
			create: async (entry) => {
				await createEntry(entry);
			},
			createHub: async (hub) => {
				await createHub(hub);
			},
			createSource: async ({ slug, ...source }) => {
				await createSource({ slug, source });
			},
			markSafetyReviewed: async (slug) => {
				await markReviewed({ slug });
			},
			publish: async (slug) => {
				await publishEntry({ slug });
			},
			publishHub: async (slug) => {
				await publishHub({ slug });
			},
			recordConsent: async (slug) => {
				await recordConsent({ slug });
			},
			replaceHubCover: () => Promise.reject(new UploadsPendingError()),
			retire: async (slug) => {
				await retireEntry({ slug });
			},
			retireHub: async (slug) => {
				await retireHub({ slug });
			},
			save: async (slug, patch, body) => {
				const entry = { ...find(entries, slug), ...patch };
				await saveEntry({
					credits: entry.credits,
					entry: {
						contentNote: entry.contentNote || undefined,
						dek: entry.dek,
						primarySubject: entry.primarySubject,
						reflectPrompt: entry.reflectPrompt || undefined,
						storyDescriptor: entry.storyDescriptor || undefined,
						title: entry.title,
					},
					facets: entry.facets,
					markdown: body ?? bodies?.[slug] ?? "",
					slug,
				});
			},
			saveHub: async (slug, patch) => {
				const hub = { ...find(hubs, slug), ...patch };
				await saveHub({
					intro: hub.intro,
					items: hub.items,
					slug,
					title: hub.title,
				});
			},
			saveSource: async (slug, patch) => {
				const { slug: _slug, ...source } = { ...find(sources, slug), ...patch };
				await saveSource({ slug, source });
			},
		},
		meta: { backend: "convex", now, ready, uploads: false },
		state: { bodies: bodies ?? {}, entries, hubs, sources },
	};

	return <LibraryContext value={value}>{children}</LibraryContext>;
}
