import {
	PRIVACY_COPY as C,
	DELETE_COPY,
	type DeleteSheetCopy,
	RETENTION,
	type Retention,
	type SheetKind,
} from "@/features/settings/privacy/copy";

/** Pure: what Privacy & Data and its delete sheet show, from the preferences and choices. */

const retentionById = (id: Retention) =>
	RETENTION.find((r) => r.id === id) ?? RETENTION[0];

/** The sheet's `kind` param; anything else opens the data sheet, the milder one. */
export const sheetKind = (raw: string | string[] | undefined): SheetKind =>
	raw === "account" ? "account" : "data";

/** On by default (undefined is on), as production reads it (Cognition Layer §1.1b). */
export const memoryOn = (personalMemoryEnabled: boolean | undefined) =>
	personalMemoryEnabled !== false;

/** Longest last: a move down this list shortens retention (the backend's `KEEPS_LONGER`). */
const KEEPS_LONGER: readonly Retention[] = ["6_months", "1_year", "indefinite"];

export const shortens = (from: Retention, to: Retention) =>
	KEEPS_LONGER.indexOf(to) < KEEPS_LONGER.indexOf(from);

/**
 * What picking `to` does: nothing (already chosen), save it (keeping longer deletes nothing), or
 * count what would go first (shorter).
 */
export function retentionPick(
	from: Retention,
	to: Retention
): "none" | "save" | "count" {
	if (from === to) {
		return "none";
	}
	return shortens(from, to) ? "count" : "save";
}

/** The backend's count (`privacy.retention.countSessionsPastRetention`). */
export type PastRetention = { count: number; capped: boolean };

/** After the count: ask only when something would go. */
export const askAfterCount = (past: PastRetention) =>
	past.capped || past.count > 0;

/** The alert for a shorter period that would delete sessions. */
export function retentionAlert(pending: Retention, past: PastRetention) {
	const count = past.capped ? C.alert.capped(past.count) : String(past.count);
	return {
		body: C.alert.body(count),
		title: C.alert.title(retentionById(pending).ago),
	};
}

/** The choice the list and card show: the one being asked about, while the alert is up. */
export const shownRetention = (stored: Retention, pending: Retention | null) =>
	pending ?? stored;

/**
 * "What Xolace keeps": four lines following the choices below it, and one spoken label. No
 * session count: the backend serves no client-safe count of kept sessions (only the retention
 * alert's count of what would go).
 */
export function keepCard({
	retention,
	memory,
	share,
}: {
	retention: Retention;
	memory: boolean;
	share: boolean;
}) {
	const sessions = retentionById(retention).line;
	return {
		a11y: C.a11y(sessions, memory, share),
		memory: memory ? C.memoryOn : C.memoryOff,
		never: C.never,
		sessions,
		share: share ? C.shareOn : C.shareOff,
	};
}

/**
 * `requestDeletion` refused with `account_inactive` (`requireAuth`): an earlier attempt already
 * deleted the account and then failed to sign out. The server is the truth, so it counts as
 * requested and the sheet goes straight on to signing out.
 */
export const deletionAlreadyRequested = (code: string | undefined) =>
	code === "account_inactive";

/** A delete sheet's words: on Xolace+ the account sheet adds who holds the billing. */
export function deleteSheet(
	kind: SheetKind,
	plus: boolean,
	os: "ios" | "android"
): DeleteSheetCopy {
	const sheet = DELETE_COPY.sheets[kind];
	if (kind !== "account" || !plus) {
		return sheet;
	}
	return { ...sheet, stays: [...sheet.stays, DELETE_COPY.plusBilling[os]] };
}
