import type { BridgeQuota } from "@/features/care/bridge/bridge-model";

/** The prototype's draft, for Mum (`BRIDGE.draft`). */
export const MUM_DRAFT =
	"Mum, I've been carrying more than I've let on lately. Work has been heavy and I haven't been sleeping well. I'm okay, but I wanted you to know, and I'd love to talk this weekend if you're free.";

export const MUM = {
	addressTerm: "Mum",
	name: "Mum",
	relationship: "parent",
} as const;

/** 55 characters: five left, so the counter shows. */
export const LONG_NAME =
	"Auntie Efua from church, who always asks how I'm doing";

export const FREE_ONE_LEFT: BridgeQuota = {
	draftsRemaining: 1,
	isPremium: false,
	plusDrafts: 10,
};
export const FREE_OUT: BridgeQuota = { ...FREE_ONE_LEFT, draftsRemaining: 0 };
export const PLUS_SPARE: BridgeQuota = {
	draftsRemaining: 9,
	isPremium: true,
	plusDrafts: 10,
};
export const PLUS_OUT: BridgeQuota = { ...PLUS_SPARE, draftsRemaining: 0 };
