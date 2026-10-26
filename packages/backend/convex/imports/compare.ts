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
		try {
			if (!TARGET_ROLES[target].includes(d.role)) {
				reject(`A ${TYPE_LABEL[type]} isn't part of a ${target} import.`);
			}
			if (seen.has(`${type}:${slug}`)) {
				reject(`This ${TYPE_LABEL[type]} is in the drop twice: keep one.`);
			}
			seen.add(`${type}:${slug}`);
			items.push(await COMPARE[type](scope, d, index));
		} catch (error) {
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
