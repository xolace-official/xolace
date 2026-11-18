/** Settings › Privacy & Data on fixtures: the board's account (handoff settings-sections.md §1). */
import type { DeleteSheet } from "@/features/settings/privacy/delete/delete-sheet-data";
import type { Privacy } from "@/features/settings/privacy/privacy-data";
import type { PastRetention } from "@/features/settings/privacy/privacy-model";

const ignore = () => undefined;

export const PRIVACY_ACTIONS: Privacy["actions"] = {
	cancelRetention: ignore,
	closePolicy: ignore,
	confirmRetention: ignore,
	openCopy: ignore,
	openDelete: ignore,
	openPolicy: ignore,
	pickRetention: ignore,
	setMemory: ignore,
	setShare: ignore,
};

type State = Privacy["state"];

/** The board's 46 sessions: 17 older than 6 months, 8 older than a year. */
export const PAST_6_MONTHS: PastRetention = { capped: false, count: 17 };
export const PAST_1_YEAR: PastRetention = { capped: false, count: 8 };
/** More than the backend counts (`MAX_COUNTED`). */
export const PAST_CAPPED: PastRetention = { capped: true, count: 100 };

/** Render 22: memory on, sharing off, kept until deleted. */
export const PRIVACY_TOP: State = {
	applying: false,
	loading: false,
	memory: true,
	past: null,
	pending: null,
	policyOpen: false,
	retention: "indefinite",
	share: false,
};

/** Render 23: the card's lines follow the switches. */
export const PRIVACY_MEMORY_OFF_SHARE_ON: State = {
	...PRIVACY_TOP,
	memory: false,
	share: true,
};

/** Render 24: 6 months picked, 17 would go; the list shows the choice being asked about. */
export const PRIVACY_6_MONTHS_ALERT: State = {
	...PRIVACY_TOP,
	past: PAST_6_MONTHS,
	pending: "6_months",
};

/** A year picked, 8 would go. */
export const PRIVACY_1_YEAR_ALERT: State = {
	...PRIVACY_TOP,
	past: PAST_1_YEAR,
	pending: "1_year",
};

/** More than 100 would go. */
export const PRIVACY_ALERT_CAPPED: State = {
	...PRIVACY_TOP,
	past: PAST_CAPPED,
	pending: "6_months",
};

/** Render 25: after "Delete them", 6 months is saved. */
export const PRIVACY_6_MONTHS: State = {
	...PRIVACY_TOP,
	retention: "6_months",
};

/** The policy sheet up. */
export const PRIVACY_POLICY_OPEN: State = { ...PRIVACY_TOP, policyOpen: true };

/** Preferences still loading: production's defaults, no check on the list. */
export const PRIVACY_LOADING: State = { ...PRIVACY_TOP, loading: true };

export const DELETE_ACTIONS: DeleteSheet["actions"] = {
	confirm: ignore,
	keep: ignore,
};

type Sheet = DeleteSheet["state"];

/** Render 27: Delete all my data. */
export const DELETE_DATA: Sheet = { busy: false, kind: "data", plus: false };
export const DELETE_DATA_BUSY: Sheet = { ...DELETE_DATA, busy: true };
/** Delete account, free. */
export const DELETE_ACCOUNT: Sheet = {
	busy: false,
	kind: "account",
	plus: false,
};
/** Render 29: Delete account on Xolace+ (who holds the billing). */
export const DELETE_ACCOUNT_PLUS: Sheet = { ...DELETE_ACCOUNT, plus: true };
