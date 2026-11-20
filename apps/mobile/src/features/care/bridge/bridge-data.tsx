import type { Id } from "@xolace/backend/dataModel";
import { createContext, type ReactNode, use } from "react";
import type {
	BridgeStep,
	DraftStatus,
	QuotaHint,
	Relationship,
} from "@/features/care/bridge/bridge-model";
import { useBridge } from "@/features/care/bridge/use-bridge";

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
			written: string | null;
			shared: boolean;
		};
		quota: QuotaHint | null;
	};
	actions: {
		begin: () => void;
		setName: (name: string) => void;
		selectRelationship: (relationship: Relationship) => void;
		setAddressTerm: (term: string | null) => void;
		write: () => void;
		back: () => void;
		setDraft: (text: string) => void;
		share: () => void;
		complete: () => void;
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
