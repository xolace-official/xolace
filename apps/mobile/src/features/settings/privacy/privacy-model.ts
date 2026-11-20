import type { PlusStatus } from "@/features/purchases/plus-status";
import {
	PRIVACY_COPY as C,
	DELETE_COPY,
	type DeleteSheetCopy,
	RETENTION,
	type Retention,
	type SheetKind,
} from "@/features/settings/privacy/copy";

const retentionById = (id: Retention) =>
	RETENTION.find((r) => r.id === id) ?? RETENTION[0];

export const sheetKind = (raw: string | string[] | undefined): SheetKind =>
	raw === "account" ? "account" : "data";

export const memoryOn = (personalMemoryEnabled: boolean | undefined) =>
	personalMemoryEnabled !== false;

const KEEPS_LONGER: readonly Retention[] = ["6_months", "1_year", "indefinite"];

export const shortens = (from: Retention, to: Retention) =>
	KEEPS_LONGER.indexOf(to) < KEEPS_LONGER.indexOf(from);

export function retentionPick(
	from: Retention,
	to: Retention
): "none" | "save" | "count" {
	if (from === to) {
		return "none";
	}
	return shortens(from, to) ? "count" : "save";
}

export type PastRetention = { count: number; capped: boolean };

export const askAfterCount = (past: PastRetention) =>
	past.capped || past.count > 0;

export function retentionAlert(pending: Retention, past: PastRetention) {
	const count = past.capped ? C.alert.capped(past.count) : String(past.count);
	return {
		body: C.alert.body(count),
		title: C.alert.title(retentionById(pending).ago),
	};
}

export const shownRetention = (stored: Retention, pending: Retention | null) =>
	pending ?? stored;

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

export const deletionAlreadyRequested = (code: string | undefined) =>
	code === "account_inactive";

export function deleteSheet(
	kind: SheetKind,
	plus: PlusStatus,
	os: "ios" | "android"
): DeleteSheetCopy {
	const sheet = DELETE_COPY.sheets[kind];
	if (kind !== "account" || plus === "free") {
		return sheet;
	}
	return { ...sheet, stays: [...sheet.stays, DELETE_COPY.plusBilling[os]] };
}
