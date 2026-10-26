import { ValidationError } from "convex-helpers/validators";

/**
 * Field-by-field diffs for the import review. Both sides are mapped to the
 * same view (label → display string) first: the stored row through what
 * reads it back, the file record as it would be written. A record with no
 * differing field is Unchanged, whatever its hash.
 */

/** As `import_items.changes` stores it. */
export interface FieldChange {
	after?: string;
	before?: string;
	field: string;
	long?: boolean;
}

/** One field as the reviewer sees it. `long` text is shown as a line diff. */
export interface ViewField {
	long?: boolean;
	value: string | undefined;
}

/** Label → field, in the order the review lists them. */
export type View = Record<string, ViewField>;

const DAY_MS = 86_400_000;

/** `2026-05-03`: unambiguous, and the same on every server. */
export const showDate = (ms: number | undefined) =>
	ms === undefined ? undefined : new Date(ms).toISOString().slice(0, 10);

/** `2026-05-03 14:20 UTC` when the time of day matters (a review stamp). */
export const showTime = (ms: number | undefined) =>
	ms === undefined
		? undefined
		: `${new Date(ms).toISOString().slice(0, 16).replace("T", " ")} UTC`;

export const showBool = (value: boolean | undefined) =>
	value === undefined ? undefined : value ? "Yes" : "No";

export const showList = (values: readonly string[] | undefined) =>
	values && values.length > 0 ? values.join(", ") : undefined;

const SECONDS_PER_MIN = 60;

/** `3:58` */
export function showDuration(sec: number | undefined) {
	if (sec === undefined) {
		return;
	}
	const minutes = Math.floor(sec / SECONDS_PER_MIN);
	const seconds = String(Math.round(sec % SECONDS_PER_MIN)).padStart(2, "0");
	return `${minutes}:${seconds}`;
}

export const showDays = (days: number | undefined) =>
	days === undefined ? undefined : `${days} day${days === 1 ? "" : "s"}`;

/** Text as written, with blank values treated as absent. */
export const showText = (value: string | undefined) =>
	value?.trim() ? value : undefined;

const SHORT_HASH = 8;

/** A content-addressed image or audio file, named by the start of its hash. */
export const showHash = (sha256: string | undefined) =>
	sha256 ? `file ${sha256.slice(0, SHORT_HASH)}…` : undefined;

/** Every field whose display value differs, labelled for the review. */
export function diffViews(before: View, after: View): FieldChange[] {
	const changes: FieldChange[] = [];
	for (const field of new Set([
		...Object.keys(after),
		...Object.keys(before),
	])) {
		const was = before[field]?.value;
		const now = after[field]?.value;
		if (was === now) {
			continue;
		}
		changes.push({
			after: now,
			before: was,
			field,
			...((before[field]?.long || after[field]?.long) && { long: true }),
		});
	}
	return changes;
}

/** Days since `retrievedAt`, for the refresh warning. */
export const daysSince = (ms: number, now: number) =>
	Math.floor((now - ms) / DAY_MS);

/** A validator error, as the reviewer can act on it. */
export function describeInvalid(error: unknown) {
	if (!(error instanceof ValidationError)) {
		return "doesn't match the record shape";
	}
	const field = error.path ? `"${error.path}"` : "the record";
	if (error.expected === "nothing") {
		return `${field} isn't a field this record has`;
	}
	return `${field} should be ${error.expected}, not ${error.got}`;
}
