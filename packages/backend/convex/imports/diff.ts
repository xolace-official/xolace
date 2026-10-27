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

/**
 * One field as the reviewer sees it. `long` text is shown as a line diff.
 * `exact` is the whole value when `value` shows less of it (a date without
 * its time): it's what's compared, and what's shown when the `value`s match.
 */
export interface ViewField {
	exact?: string;
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

/** `2026-05-03T14:20:07.123Z`: to the millisecond. */
export const showInstant = (ms: number | undefined) =>
	ms === undefined ? undefined : new Date(ms).toISOString();

/** A date field, compared to the millisecond. */
export const dateField = (ms: number | undefined): ViewField => ({
	exact: showInstant(ms),
	value: showDate(ms),
});

/** A time field, compared to the millisecond. */
export const timeField = (ms: number | undefined): ViewField => ({
	exact: showInstant(ms),
	value: showTime(ms),
});

export const showBool = (value: boolean | undefined) =>
	value === undefined ? undefined : value ? "Yes" : "No";

export const showList = (values: readonly string[] | undefined) =>
	values && values.length > 0 ? values.join(", ") : undefined;

/** A list field, compared item by item: `["a, b"]` isn't `["a", "b"]`. */
export const listField = (
	values: readonly string[] | undefined
): ViewField => ({
	exact: values && values.length > 0 ? JSON.stringify(values) : undefined,
	value: showList(values),
});

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

/** A file field, compared on its whole hash. */
export const hashField = (sha256: string | undefined): ViewField => ({
	exact: sha256 || undefined,
	value: showHash(sha256),
});

const whole = (f: ViewField | undefined) => f?.exact ?? f?.value;

/**
 * Every field whose whole value differs, labelled for the review: a change
 * the display rounds away still counts, or the record would read Unchanged
 * and never be written.
 */
export function diffViews(before: View, after: View): FieldChange[] {
	const changes: FieldChange[] = [];
	for (const field of new Set([
		...Object.keys(after),
		...Object.keys(before),
	])) {
		const was = before[field];
		const now = after[field];
		if (whole(was) === whole(now)) {
			continue;
		}
		const precise = was?.value === now?.value;
		changes.push({
			after: precise ? whole(now) : now?.value,
			before: precise ? whole(was) : was?.value,
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
