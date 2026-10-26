import type { ContentStatus } from "@/features/content/status-badge";

// The admin's view of `library_*` rows (packages/backend/convex/schema.ts). The Convex
// provider maps rows into these; the screens never see table shapes.

export const ENTRY_KINDS = ["explainer", "advice", "story"] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export type EntryReuse = "verbatim" | "adapted" | "original";

/** One `library_entry_sources` row: a page the entry draws on. */
export interface EntryCredit {
	author?: string;
	pageTitle: string;
	pageUrl?: string;
	retrievedAt?: number;
	/** `library_sources.slug` */
	source: string;
}

export interface EntryNarration {
	durationSec: number;
	failure?: ProcessingFailure;
	hasTranscript: boolean;
	status: ContentStatus;
}

export interface ProcessingFailure {
	message: string;
	step: string;
}

export interface LibraryEntry {
	active: boolean;
	consentRecordedAt?: number;
	contentNote?: string;
	credits: EntryCredit[];
	dek: string;
	/** axis → slugs, e.g. `{ emotion: ["stress"] }` */
	facets: Record<string, string[]>;
	hasCover: boolean;
	kind: EntryKind;
	lastReviewedAt: number;
	narration?: EntryNarration;
	primarySubject: string;
	publishedAt?: number;
	readMin: number;
	reflectPrompt?: string;
	retrievedAt?: number;
	reuse: EntryReuse;
	safetyReviewedAt?: number;
	slug: string;
	status: ContentStatus;
	storyDescriptor?: string;
	title: string;
	updatedAt: number;
}

export interface LibrarySource {
	attributionText: string;
	licence: string;
	name: string;
	permission: "not_required" | "granted" | "pending";
	refreshDays?: number;
	slug: string;
	url?: string;
}

export const KIND_LABEL: Record<EntryKind, string> = {
	advice: "Advice",
	explainer: "Explainer",
	story: "Story",
};

/** `starting-university` → `Starting university` */
export function humanize(slug: string) {
	const words = slug.replaceAll("-", " ");
	return words.charAt(0).toUpperCase() + words.slice(1);
}

const DATE = new Intl.DateTimeFormat("en-GB", {
	day: "numeric",
	month: "short",
	timeZone: "UTC",
	year: "numeric",
});

/** Fixed locale and zone so server and client render the same string. */
export function formatDate(ms: number) {
	return DATE.format(ms);
}

const SECONDS_PER_MINUTE = 60;

export function formatDuration(sec: number) {
	const minutes = Math.floor(sec / SECONDS_PER_MINUTE);
	const seconds = sec % SECONDS_PER_MINUTE;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
