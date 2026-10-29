import type { Id } from "@xolace/backend/dataModel";

import type { ContentStatus } from "@/features/content/status-badge";
import type { ProcessingFailure } from "@/features/library/types";

// The admin's view of a bulk import (`api.admin.imports`): records (plus bodies and
// media) compared field by field against what the deployment holds, reviewed, then
// applied item by item. Every record is keyed by slug: an unchanged record is
// skipped and a rejected one never reaches the tables.

export const IMPORT_TARGETS = ["library", "audio"] as const;
export type ImportTarget = (typeof IMPORT_TARGETS)[number];

export const TARGET_LABEL: Record<ImportTarget, string> = {
	audio: "Audio tracks",
	library: "Library",
};

/** What the target's script reads, in upsert order. */
export const TARGET_FILES: Record<ImportTarget, string> = {
	audio: "tracks and topic covers, with their audio and thumbnails",
	library:
		"entries plus any sources and hubs they need, with bodies and covers. Narration stays in the script for now",
};

export type RecordType =
	| "source"
	| "entry"
	| "hub"
	| "narration"
	| "topic"
	| "track";

export const RECORD_LABEL: Record<RecordType, string> = {
	entry: "Entry",
	hub: "Hub",
	narration: "Narration",
	source: "Source",
	topic: "Topic",
	track: "Track",
};

export const DIFF_ACTIONS = [
	"rejected",
	"changed",
	"new",
	"unchanged",
] as const;
export type DiffAction = (typeof DIFF_ACTIONS)[number];

/** One field that differs from what's stored. Values are display strings. */
export interface FieldChange {
	after?: string;
	before?: string;
	field: string;
	/** Long text (a markdown body, a transcript): shown as a line diff. */
	long?: boolean;
}

export interface MediaFile {
	bytes: number;
	kind: "audio" | "cover" | "thumb";
	name: string;
}

export interface ImportItem {
	action: DiffAction;
	changes?: FieldChange[];
	/** What Retry and leaving it out name. */
	id: Id<"import_items">;
	media?: MediaFile[];
	/** Why it can't be applied (a hard gate). Only on `rejected`. */
	rejection?: string;
	/** Per-item processing once the run is applied. */
	run?: {
		/** 1 on the first try; Retry bumps it. */
		attempt?: number;
		failure?: ProcessingFailure;
		status: ContentStatus;
		/** The workflow step running now, e.g. "Upload cover". */
		step?: string;
	};
	/** Left out of this run by the reviewer. */
	skipped?: boolean;
	slug: string;
	title: string;
	type: RecordType;
	/** Soft gates: applied anyway, but worth a look. */
	warnings?: string[];
}

/** `uploading` until the browser has PUT the files compare asked for. */
export type RunState =
	| "uploading"
	| "review"
	| "applying"
	| "done"
	| "discarded";

/** A run as the list shows it; its items load with the run. */
export interface ImportRunSummary {
	appliedAt?: number;
	counts: Record<DiffAction, number>;
	createdAt: number;
	createdBy: string;
	/** Items failed right now. */
	failed: number;
	/** What was dropped in, e.g. "4 JSON, 6 markdown, 6 media". */
	files: string;
	/** 1, 2, 3…: the run's name and its link. */
	number: number;
	state: RunState;
	target: ImportTarget;
}

export interface ImportRun extends ImportRunSummary {
	items: ImportItem[];
}

export const runLabel = (run: Pick<ImportRunSummary, "number">) =>
	`Import #${run.number}`;

/** Items that do something when applied. */
export function isApplicable(item: ImportItem) {
	return (item.action === "new" || item.action === "changed") && !item.skipped;
}

export function countByAction(items: readonly ImportItem[]) {
	const counts: Record<DiffAction, number> = {
		changed: 0,
		new: 0,
		rejected: 0,
		unchanged: 0,
	};
	for (const item of items) {
		counts[item.action] += 1;
	}
	return counts;
}

export function countByStatus(items: readonly ImportItem[]) {
	const counts: Partial<Record<ContentStatus, number>> = {};
	for (const item of items) {
		if (item.run) {
			counts[item.run.status] = (counts[item.run.status] ?? 0) + 1;
		}
	}
	return counts;
}

const KB = 1024;

export function formatBytes(bytes: number) {
	if (bytes < KB) {
		return `${bytes} B`;
	}
	if (bytes < KB * KB) {
		return `${Math.round(bytes / KB)} KB`;
	}
	return `${(bytes / (KB * KB)).toFixed(1)} MB`;
}
