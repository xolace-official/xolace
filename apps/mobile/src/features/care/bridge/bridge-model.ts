import { COPY } from "@/features/care/bridge/copy";

export type Relationship = "parent" | "partner" | "friend" | "sibling";
export const RELATIONSHIPS: readonly Relationship[] = [
	"parent",
	"partner",
	"friend",
	"sibling",
];

export const ADDRESS_TERMS: Readonly<Record<Relationship, readonly string[]>> =
	{
		friend: [],
		parent: ["Mom", "Mum", "Mama", "Dad", "Ma"],
		partner: ["babe", "love", "honey"],
		sibling: ["bro", "sis", "bruh"],
	};

export const MAX_NAME_LENGTH = 60;
export const MAX_ADDRESS_TERM_LENGTH = 40;
const COUNTER_REVEAL = 10;

export function charactersLeft(value: string, max: number): number | null {
	const left = max - value.length;
	return left <= COUNTER_REVEAL ? left : null;
}

export type BridgeStep = "intro" | "recipient" | "draft";
export type DraftStatus =
	| "idle"
	| "loading"
	| "success"
	| "error"
	| "rate_limited";

export const recipientOf = (name: string): string =>
	name.trim() || COPY.loading.them;

export const canWrite = (name: string): boolean => name.trim().length > 0;

const RATE_LIMITED = "bridge_rate_limited";

export const failedStatus = (code: string | undefined): DraftStatus =>
	code === RATE_LIMITED ? "rate_limited" : "error";

export function noticeOf(
	status: DraftStatus
): { kind: "rate_limited" | "error"; text: string } | null {
	if (status === "rate_limited") {
		return { kind: status, text: COPY.draft.rateLimited };
	}
	if (status === "error") {
		return { kind: status, text: COPY.draft.error };
	}
	return null;
}

export type BridgeQuota = {
	isPremium: boolean;
	draftsRemaining: number;
	plusDrafts: number;
};

export type QuotaHint = {
	text: string;
	plus: { text: string; label: string } | null;
};

export function quotaHintOf(quota: BridgeQuota | undefined): QuotaHint | null {
	if (!quota) {
		return null;
	}
	const out = quota.draftsRemaining === 0;
	if (quota.isPremium) {
		return out ? { plus: null, text: COPY.quota.plusOut } : null;
	}
	return {
		plus: {
			label: COPY.quota.plusLabel(quota.plusDrafts),
			text: COPY.quota.plus(quota.plusDrafts),
		},
		text: out ? COPY.quota.freeOut : COPY.quota.freeLeft(quota.draftsRemaining),
	};
}
