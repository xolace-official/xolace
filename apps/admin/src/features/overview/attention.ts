import type { AudioTrack } from "@/features/audio/types";
import type { ImportRun } from "@/features/imports/types";
import { citationsOf } from "@/features/library/citations";
import type {
	LibraryEntry,
	LibraryHub,
	LibrarySource,
} from "@/features/library/types";

// What the Overview's "Needs attention" list holds: the same rules the editors check,
// read across every content type so nobody has to open each list to find them.

export const ATTENTION_KINDS = [
	"failed",
	"safety",
	"consent",
	"stale",
	"permission",
	"hub",
] as const;
export type AttentionKind = (typeof ATTENTION_KINDS)[number];

export const ATTENTION_HEADING: Record<AttentionKind, string> = {
	consent: "Stories missing consent",
	failed: "Failed processing",
	hub: "Live hubs with hidden items",
	permission: "Permission pending",
	safety: "Awaiting safety review",
	stale: "Sources past their refresh",
};

export interface AttentionItem {
	/** Where the fix happens: an editor or an import run. */
	href: string;
	id: string;
	kind: AttentionKind;
	/** One line: what's wrong. */
	reason: string;
	title: string;
}

const SAFETY_TIER = 3;

interface ContentSnapshot {
	entries: readonly LibraryEntry[];
	hubs: readonly LibraryHub[];
	now: number;
	runs: readonly ImportRun[];
	sources: readonly LibrarySource[];
	tracks: readonly AudioTrack[];
}

export function needsAttention(content: ContentSnapshot): AttentionItem[] {
	return [
		...failedItems(content),
		...entryReviews(content.entries),
		...trackReviews(content.tracks),
		...sourceItems(content),
		...hubItems(content),
	];
}

function failedItems({
	entries,
	runs,
	tracks,
}: ContentSnapshot): AttentionItem[] {
	const tracksFailed = tracks
		.filter((track) => track.status === "failed")
		.map((track) => ({
			href: `/audio/${track.slug}`,
			id: `track-failed:${track.slug}`,
			kind: "failed" as const,
			reason: track.failure
				? `${track.failure.step} failed`
				: "Processing failed",
			title: track.title,
		}));
	const narrationsFailed = entries
		.filter((entry) => entry.narration?.status === "failed")
		.map((entry) => ({
			href: `/library/${entry.slug}`,
			id: `narration-failed:${entry.slug}`,
			kind: "failed" as const,
			reason: entry.narration?.failure
				? `${entry.narration.failure.step} failed`
				: "Narration processing failed",
			title: entry.title,
		}));
	const runsFailed = runs.flatMap((run) => {
		const failed = run.items.filter(
			(item) => item.run?.status === "failed"
		).length;
		return failed === 0
			? []
			: [
					{
						href: `/imports/${run.id}`,
						id: `run-failed:${run.id}`,
						kind: "failed" as const,
						reason: `${failed} item${failed === 1 ? "" : "s"} failed in this import`,
						title: run.id,
					},
				];
	});
	return [...tracksFailed, ...narrationsFailed, ...runsFailed];
}

/** Not yet live or retired: still on its way to readers. */
function inProgress(status: string) {
	return status !== "live" && status !== "retired";
}

function entryReviews(entries: readonly LibraryEntry[]): AttentionItem[] {
	const safety = entries
		.filter(
			(entry) =>
				inProgress(entry.status) &&
				entry.kind === "explainer" &&
				!entry.safetyReviewedAt
		)
		.map((entry) => ({
			href: `/library/${entry.slug}`,
			id: `entry-safety:${entry.slug}`,
			kind: "safety" as const,
			reason: "Explainer: its current body hasn't been reviewed",
			title: entry.title,
		}));
	const consent = entries
		.filter(
			(entry) =>
				inProgress(entry.status) &&
				entry.kind === "story" &&
				!entry.consentRecordedAt
		)
		.map((entry) => ({
			href: `/library/${entry.slug}`,
			id: `entry-consent:${entry.slug}`,
			kind: "consent" as const,
			reason: entry.storyDescriptor
				? `Told by ${entry.storyDescriptor}`
				: "No consent recorded",
			title: entry.title,
		}));
	return [...safety, ...consent];
}

function trackReviews(tracks: readonly AudioTrack[]): AttentionItem[] {
	return tracks
		.filter(
			(track) =>
				inProgress(track.status) &&
				track.family === "support" &&
				(track.tier ?? 0) >= SAFETY_TIER &&
				!track.safetyReviewedAt
		)
		.map((track) => ({
			href: `/audio/${track.slug}`,
			id: `track-safety:${track.slug}`,
			kind: "safety" as const,
			reason: `Support audio, tier ${track.tier}`,
			title: track.title,
		}));
}

function sourceItems({
	entries,
	now,
	sources,
}: ContentSnapshot): AttentionItem[] {
	return sources.flatMap((source) => {
		const items: AttentionItem[] = [];
		const stale = citationsOf(source, entries, now).filter((c) => c.stale);
		if (stale.length > 0) {
			items.push({
				href: `/library/sources/${source.slug}`,
				id: `source-stale:${source.slug}`,
				kind: "stale",
				reason: `${stale.length} credit${stale.length === 1 ? "" : "s"} older than ${source.refreshDays} days`,
				title: source.name,
			});
		}
		if (source.permission === "pending") {
			items.push({
				href: `/library/sources/${source.slug}`,
				id: `source-permission:${source.slug}`,
				kind: "permission",
				reason: "We asked to reuse it and are waiting",
				title: source.name,
			});
		}
		return items;
	});
}

function hubItems({ entries, hubs, tracks }: ContentSnapshot): AttentionItem[] {
	const statusOf = (item: LibraryHub["items"][number]) =>
		item.kind === "entry"
			? entries.find((e) => e.slug === item.ref)?.status
			: tracks.find((t) => t.slug === item.ref)?.status;
	return hubs.flatMap((hub) => {
		if (hub.status !== "live") {
			return [];
		}
		const hidden = hub.items.filter((item) => statusOf(item) !== "live").length;
		return hidden === 0
			? []
			: [
					{
						href: `/library/hubs/${hub.slug}`,
						id: `hub-hidden:${hub.slug}`,
						kind: "hub" as const,
						reason:
							hidden === 1
								? `1 of ${hub.items.length} items isn't live, so readers skip it`
								: `${hidden} of ${hub.items.length} items aren't live, so readers skip them`,
						title: hub.title,
					},
				];
	});
}
