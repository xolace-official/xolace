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
	setReceiveLetters: ignore,
	setShare: ignore,
};

type State = Privacy["state"];

export const PAST_6_MONTHS: PastRetention = { capped: false, count: 17 };
export const PAST_1_YEAR: PastRetention = { capped: false, count: 8 };
export const PAST_CAPPED: PastRetention = { capped: true, count: 100 };

export const PRIVACY_TOP: State = {
	applying: false,
	loading: false,
	memory: true,
	past: null,
	pending: null,
	policyOpen: false,
	receiveLetters: false,
	retention: "indefinite",
	share: false,
};

export const PRIVACY_MEMORY_OFF_SHARE_ON: State = {
	...PRIVACY_TOP,
	memory: false,
	share: true,
};

export const PRIVACY_6_MONTHS_ALERT: State = {
	...PRIVACY_TOP,
	past: PAST_6_MONTHS,
	pending: "6_months",
};

export const PRIVACY_1_YEAR_ALERT: State = {
	...PRIVACY_TOP,
	past: PAST_1_YEAR,
	pending: "1_year",
};

export const PRIVACY_ALERT_CAPPED: State = {
	...PRIVACY_TOP,
	past: PAST_CAPPED,
	pending: "6_months",
};

export const PRIVACY_LETTERS_ON: State = {
	...PRIVACY_TOP,
	receiveLetters: true,
};

export const PRIVACY_6_MONTHS: State = {
	...PRIVACY_TOP,
	retention: "6_months",
};

export const PRIVACY_POLICY_OPEN: State = { ...PRIVACY_TOP, policyOpen: true };

export const PRIVACY_LOADING: State = { ...PRIVACY_TOP, loading: true };

export const DELETE_ACTIONS: DeleteSheet["actions"] = {
	confirm: ignore,
	keep: ignore,
};

type Sheet = DeleteSheet["state"];

export const DELETE_DATA: Sheet = {
	busy: false,
	deleted: false,
	kind: "data",
	plus: false,
};
export const DELETE_DATA_BUSY: Sheet = { ...DELETE_DATA, busy: true };
export const DELETE_ACCOUNT: Sheet = {
	busy: false,
	deleted: false,
	kind: "account",
	plus: false,
};
export const DELETE_ACCOUNT_PLUS: Sheet = { ...DELETE_ACCOUNT, plus: true };
export const DELETE_ACCOUNT_SIGN_OUT_LEFT: Sheet = {
	...DELETE_ACCOUNT,
	deleted: true,
};
