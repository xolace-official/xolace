/** Trusted Bridge, pure: the recipient's limits and suggestions, the quota line, and how a draft
 * request ended. */
import { COPY } from "@/features/care/bridge/copy";

export type Relationship = "parent" | "partner" | "friend" | "sibling";
export const RELATIONSHIPS: readonly Relationship[] = [
	"parent",
	"partner",
	"friend",
	"sibling",
];

/** What you call them, only where it differs from their name: a friend or a sibling's name is
 * usually what you use, so friends get no chips. */
export const ADDRESS_TERMS: Readonly<Record<Relationship, readonly string[]>> =
	{
		friend: [],
		parent: ["Mom", "Mum", "Mama", "Dad", "Ma"],
		partner: ["babe", "love", "honey"],
		sibling: ["bro", "sis", "bruh"],
	};

/** The caps `ai/bridge.ts` trims to, so a field stops at the boundary instead of losing text. */
export const MAX_NAME_LENGTH = 60;
export const MAX_ADDRESS_TERM_LENGTH = 40;
/** The counter stays hidden until this close to the cap, so a quiet screen stays quiet. */
const COUNTER_REVEAL = 10;

/** Characters left, once they're worth showing; else null. */
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

/** The recipient as the draft names them: their name, or "them" while it's blank. */
export const recipientOf = (name: string): string =>
	name.trim() || COPY.loading.them;

export const canWrite = (name: string): boolean => name.trim().length > 0;

const RATE_LIMITED = "bridge_rate_limited";

/** How a failed request ends: out of drafts isn't a failure, and says so. */
export const failedStatus = (code: string | undefined): DraftStatus =>
	code === RATE_LIMITED ? "rate_limited" : "error";

/** The note above a template that stands in for a draft; null for a written one. */
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

/** `ai.bridge.getQuota`'s fields the hint reads. */
export type BridgeQuota = {
	isPremium: boolean;
	draftsRemaining: number;
	plusDrafts: number;
};

export type QuotaHint = {
	text: string;
	/** The Xolace+ offer after it, for a free user. */
	plus: { text: string; label: string } | null;
};

/** The drafts-left line under Write. Silent while loading, and for Plus with drafts to spare.
 * UI only: the cap is enforced in `ai.bridge.requestBridgeDraft`. */
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
