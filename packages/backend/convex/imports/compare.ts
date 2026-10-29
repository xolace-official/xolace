import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import { compareTopic, compareTrack } from "./compareAudio";
import {
	compareEntry,
	compareHub,
	compareNarration,
	compareSource,
} from "./compareLibrary";
import {
	type CompareScope,
	type PlannedItem,
	reject,
	rejectionOf,
	type UploadNeed,
} from "./plan";
import {
	type DropRecord,
	type ImportTarget,
	MAX_RECORDS,
	PHASE,
	type RecordType,
	ROLE_TYPE,
	TARGET_ROLES,
	TYPE_LABEL,
} from "./records";

/**
 * The compare (admin v1 step 6c): every record in a drop checked against
 * the ingest's gates and diffed field by field against what's stored. Reads
 * only; `admin/imports.compare` stores the result as a run.
 */

type Compare = (
	scope: CompareScope,
	d: DropRecord,
	index: number
) => Promise<PlannedItem>;

const COMPARE: Record<RecordType, Compare> = {
	entry: compareEntry,
	hub: compareHub,
	narration: async () => await Promise.resolve(compareNarration()),
	source: compareSource,
	topic: compareTopic,
	track: compareTrack,
};

/**
 * Room for an item's diff and payload in one `import_items` row, under
 * Convex's 1 MB document limit. A changed body is stored three times (before,
 * after, payload), so a long body in a script with multi-byte characters
 * can pass `MAX_TEXT_CHARS` and still not fit.
 */
const MAX_ITEM_BYTES = 900_000;

const BYTES_PER_MB = 1_000_000;

/** Rejects just this record when it can't be stored, rather than failing the whole compare. */
function assertFits(item: PlannedItem) {
	const bytes = new TextEncoder().encode(
		JSON.stringify([item.changes, item.payload, item.warnings])
	).length;
	if (bytes > MAX_ITEM_BYTES) {
		reject(
			`Too big to review in one import (${(bytes / BYTES_PER_MB).toFixed(1)} MB of changes): shorten the body or transcript, or make the edit in the editor`
		);
	}
}

/**
 * What a record added to the scope, undone when it's rejected after adding
 * it (`assertFits`): its uploads aren't asked for, and later records don't
 * resolve against it.
 */
function snapshot(scope: CompareScope) {
	const entries = new Set(scope.dropEntries);
	const sources = new Set(scope.dropSources.keys());
	const uploads = new Set(scope.uploads.keys());
	return () => {
		for (const slug of scope.dropEntries) {
			if (!entries.has(slug)) {
				scope.dropEntries.delete(slug);
			}
		}
		for (const slug of scope.dropSources.keys()) {
			if (!sources.has(slug)) {
				scope.dropSources.delete(slug);
			}
		}
		for (const key of scope.uploads.keys()) {
			if (!uploads.has(key)) {
				scope.uploads.delete(key);
			}
		}
	};
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** What a record calls itself before it's validated, so even a broken one is findable. */
function nameOf(d: DropRecord, index: number) {
	const r: unknown = d.record;
	const field = (key: string) =>
		isRecord(r) && typeof r[key] === "string" && r[key] ? r[key] : undefined;
	const slug =
		field("slug") ?? field("entrySlug") ?? `record-${index + 1}-in-${d.role}`;
	return { slug, title: field("title") ?? field("name") ?? slug };
}

export async function compareDrop(
	ctx: MutationCtx,
	target: ImportTarget,
	records: readonly DropRecord[]
): Promise<{ items: PlannedItem[]; uploads: UploadNeed[] }> {
	if (records.length === 0) {
		throw new ConvexError("The drop has no records to compare");
	}
	if (records.length > MAX_RECORDS) {
		throw new ConvexError(
			`${records.length} records is over the ${MAX_RECORDS} an import takes: split the files`
		);
	}
	const scope: CompareScope = {
		ctx,
		dropEntries: new Set(),
		dropSources: new Map(),
		now: Date.now(),
		uploads: new Map(),
	};
	// Phase order, so an entry sees the drop's sources and a hub its entries.
	const order = records
		.map((d, index) => ({ d, index }))
		.sort((a, b) => PHASE[ROLE_TYPE[a.d.role]] - PHASE[ROLE_TYPE[b.d.role]]);
	const seen = new Set<string>();
	const items: PlannedItem[] = [];
	for (const { d, index } of order) {
		const type = ROLE_TYPE[d.role];
		const { slug, title } = nameOf(d, index);
		const undo = snapshot(scope);
		try {
			if (!TARGET_ROLES[target].includes(d.role)) {
				reject(`A ${TYPE_LABEL[type]} isn't part of a ${target} import.`);
			}
			if (seen.has(`${type}:${slug}`)) {
				reject(`This ${TYPE_LABEL[type]} is in the drop twice: keep one.`);
			}
			seen.add(`${type}:${slug}`);
			// A file that's in the drop but couldn't be read: never fall back to
			// the stored copy, or the replacement would be dropped unseen.
			const unreadable = Object.values(d.fileErrors ?? {}).find(Boolean);
			if (unreadable) {
				reject(unreadable);
			}
			const item = await COMPARE[type](scope, d, index);
			assertFits(item);
			items.push(item);
		} catch (error) {
			undo();
			items.push({
				action: "rejected",
				rejection: rejectionOf(error),
				skipped: false,
				slug,
				title,
				type,
			});
		}
	}
	return { items, uploads: [...scope.uploads.values()] };
}
