import { ConvexError, type Infer, type Validator } from "convex/values";
import { ValidationError, validate } from "convex-helpers/validators";
import type { MutationCtx } from "../_generated/server";
import type schema from "../schema";
import { describeInvalid, type FieldChange } from "./diff";
import type { ItemPayload, RecordType, SourceRecord } from "./records";

/**
 * What compare decides for one record, before it's stored as an
 * `import_items` row, and the shared pieces each record type's compare uses.
 */

export type DiffAction = Infer<
	typeof schema.tables.import_items.validator.fields.action
>;

type MediaKind = "audio" | "cover" | "thumb";

export interface PlannedItem {
	action: DiffAction;
	baseVersion?: string;
	changes?: FieldChange[];
	media?: { bytes: number; kind: MediaKind; name: string }[];
	payload?: ItemPayload;
	rejection?: string;
	skipped: boolean;
	slug: string;
	title: string;
	type: RecordType;
	uploads?: { bytes: number; key: string }[];
	warnings?: string[];
}

/** One file the browser must PUT before the run can be reviewed. */
export interface UploadNeed {
	bytes: number;
	/** Index of the record in the drop. */
	index: number;
	key: string;
	/** The record's audio file, or its image's WebP at this size. */
	part: "audio" | number;
}

/** What every record's compare can see: the database, and the rest of the drop. */
export interface CompareScope {
	ctx: MutationCtx;
	/** Entry slugs this drop adds or keeps, for hub items. */
	dropEntries: Set<string>;
	/** Sources this drop adds or changes, for entry credits. */
	dropSources: Map<string, SourceRecord>;
	now: number;
	/** By key: two items sharing a thumbnail upload it once. */
	uploads: Map<string, UploadNeed>;
}

/** A hard gate failed: the item is Rejected with this message. */
export class Rejection extends Error {}

export const reject = (message: string): never => {
	throw new Rejection(message);
};

/** The record as `validator` types it; a mismatch throws the `ValidationError` naming the field. */
export function parseRecord<V extends Validator<unknown, "required", string>>(
	validator: V,
	value: unknown
): Infer<V> {
	if (!validate(validator, value, { throw: true })) {
		return reject("doesn't match the record shape");
	}
	return value;
}

/** The row's own name prefix (`library entry "x": `) is noise in a list of that row's items. */
const ROW_PREFIX =
	/^(?:library (?:entry|hub|source)|audio track|audio_tracks upsert rejected: slug) "[^"]+":?\s*/;

/** The message for a record whose compare threw, or rethrows a real bug. */
export function rejectionOf(error: unknown): string {
	if (error instanceof Rejection) {
		return error.message;
	}
	if (error instanceof ValidationError) {
		return describeInvalid(error);
	}
	if (error instanceof ConvexError && typeof error.data === "string") {
		return error.data.replace(ROW_PREFIX, "");
	}
	throw error;
}

const FNV_OFFSET = 0x81_1c_9d_c5;
const FNV_PRIME = 0x01_00_01_93;

/**
 * A fingerprint of the stored row, all of it: apply fails an item whose row
 * changed in any way after compare (an admin edit, a script run, another
 * import), even within the same millisecond or by a path that doesn't stamp
 * `updatedAt`. FNV-1a over the row's JSON, which Convex returns in a stable
 * field order; it detects change, it isn't a security hash.
 */
export function versionOf(row: object) {
	let hash = FNV_OFFSET;
	for (const char of JSON.stringify(row)) {
		hash ^= char.codePointAt(0) ?? 0;
		hash = Math.imul(hash, FNV_PRIME) >>> 0;
	}
	return hash.toString(16).padStart(8, "0");
}

export const ADMIN_EDIT_WARNING =
	"Last edited in the admin. Applying replaces those edits with this file, so it starts left out: include it if the file is right.";

/** New if nothing's stored, else Changed or Unchanged by the field diff. */
export const actionOf = (
	stored: unknown,
	changes: readonly FieldChange[]
): DiffAction => {
	if (!stored) {
		return "new";
	}
	return changes.length > 0 ? "changed" : "unchanged";
};

/** Keys this item needs uploaded, added to the run's list once each. */
export function needUpload(
	scope: CompareScope,
	need: UploadNeed
): { bytes: number; key: string } {
	if (!scope.uploads.has(need.key)) {
		scope.uploads.set(need.key, need);
	}
	return { bytes: need.bytes, key: need.key };
}

/** The common tail: diff, warnings, and the edited-in-the-admin rule. */
export function planned(
	item: Omit<PlannedItem, "action" | "skipped"> & {
		editedBy?: string;
		stored: unknown;
	}
): PlannedItem {
	const { editedBy, stored, warnings = [], ...rest } = item;
	const action = actionOf(stored, rest.changes ?? []);
	const editedInAdmin = action === "changed" && editedBy !== undefined;
	const notes = editedInAdmin ? [ADMIN_EDIT_WARNING, ...warnings] : warnings;
	const applies = action === "new" || action === "changed";
	return {
		...rest,
		action,
		// Unchanged items write nothing, so they upload nothing either.
		...(applies ? {} : { payload: undefined, uploads: undefined }),
		skipped: editedInAdmin,
		...(notes.length > 0 && { warnings: notes }),
	};
}
