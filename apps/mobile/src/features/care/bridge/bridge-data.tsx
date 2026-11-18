import type { Id } from "@xolace/backend/dataModel";
import { createContext, type ReactNode, use } from "react";
import type {
	BridgeStep,
	DraftStatus,
	QuotaHint,
	Relationship,
} from "@/features/care/bridge/bridge-model";
import { useBridge } from "@/features/care/bridge/use-bridge";

/**
 * Everything Trusted Bridge reads and does, from the intro to the shared draft. Convex, PostHog,
 * the share sheet and the paywall fill it in the app (`BridgeData`); fixtures in its dev states.
 */
export type BridgeScreenData = {
	state: {
		step: BridgeStep;
		recipient: {
			name: string;
			relationship: Relationship | null;
			addressTerm: string | null;
		};
		draft: {
			status: DraftStatus;
			text: string;
			/** The draft as it was written, until it's edited: it settles in sentence by sentence. */
			written: string | null;
			/** The share sheet finished: Done shows. */
			shared: boolean;
		};
		/** The drafts-left line; null while loading or for Plus with drafts to spare. */
		quota: QuotaHint | null;
	};
	actions: {
		begin: () => void;
		setName: (name: string) => void;
		/** Choosing the chosen one clears it, and either clears what you call them. */
		selectRelationship: (relationship: Relationship) => void;
		setAddressTerm: (term: string | null) => void;
		write: () => void;
		/** From the draft back to who it's for. */
		back: () => void;
		setDraft: (text: string) => void;
		share: () => void;
		complete: () => void;
		/** Close on the recipient step, "Not right now" on the draft. */
		dismiss: () => void;
		getPlus: () => void;
	};
};

const Context = createContext<BridgeScreenData | null>(null);

export function BridgeProvider({
	value,
	children,
}: {
	value: BridgeScreenData;
	children: ReactNode;
}) {
	return <Context value={value}>{children}</Context>;
}

export function BridgeData({
	sessionId,
	stepId,
	children,
}: {
	sessionId: Id<"sessions">;
	stepId?: Id<"path_steps">;
	children: ReactNode;
}) {
	return (
		<BridgeProvider value={useBridge(sessionId, stepId)}>
			{children}
		</BridgeProvider>
	);
}

export function useBridgeScreen(): BridgeScreenData {
	const value = use(Context);
	if (!value) {
		throw new Error("useBridgeScreen outside BridgeData");
	}
	return value;
}
