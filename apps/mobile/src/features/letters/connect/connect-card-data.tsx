import { createContext, type ReactNode, use } from "react";
import type { LettersStatus, OptIn } from "../letters-model";
import { useConnectCardData } from "./use-connect-card";

export type ConnectCard = {
	state: { status: LettersStatus };
	actions: {
		answerOffer: (optIn: Exclude<OptIn, "unset">) => void;
		openLetters: () => void;
		openLetter: (id: string) => void;
		openWrite: () => void;
	};
};

const ConnectCardContext = createContext<ConnectCard | null>(null);

export function ConnectCardProvider({
	value,
	children,
}: {
	value: ConnectCard;
	children: ReactNode;
}) {
	return <ConnectCardContext value={value}>{children}</ConnectCardContext>;
}

export function ConnectCardData({ children }: { children: ReactNode }) {
	const value = useConnectCardData();
	return value ? (
		<ConnectCardProvider value={value}>{children}</ConnectCardProvider>
	) : null;
}

export function useConnectCard(): ConnectCard {
	const value = use(ConnectCardContext);
	if (!value) {
		throw new Error("useConnectCard needs a ConnectCardProvider above it");
	}
	return value;
}
