import { createContext, type ReactNode, use } from "react";
import type {
	LettersStatus,
	OptIn,
	ReceivedLetter,
	SentLetter,
} from "../letters-model";
import { useLettersHub } from "./use-letters-hub";

export type LettersHub = {
	state: {
		status: LettersStatus;
		sent: readonly SentLetter[];
		received: readonly ReceivedLetter[];
		opens: { hidden: boolean; withdraw: string | null };
	};
	actions: {
		answerOffer: (optIn: Exclude<OptIn, "unset">) => void;
		turnOn: () => void;
		withdraw: (id: string) => void;
		dismiss: (id: string) => void;
		markSeen: (ids: readonly string[]) => void;
	};
};

const HubContext = createContext<LettersHub | null>(null);

export function LettersHubProvider({
	value,
	children,
}: {
	value: LettersHub;
	children: ReactNode;
}) {
	return <HubContext value={value}>{children}</HubContext>;
}

export function LettersHubData({
	children,
	loading,
}: {
	children: ReactNode;
	loading: ReactNode;
}) {
	const value = useLettersHub();
	return value ? (
		<LettersHubProvider value={value}>{children}</LettersHubProvider>
	) : (
		loading
	);
}

export function useLettersHubScreen(): LettersHub {
	const value = use(HubContext);
	if (!value) {
		throw new Error("useLettersHubScreen needs a LettersHubProvider above it");
	}
	return value;
}
