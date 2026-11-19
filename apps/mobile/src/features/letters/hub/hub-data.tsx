import { createContext, type ReactNode, use } from "react";
import type {
	LettersStatus,
	OptIn,
	ReceivedLetter,
	SentLetter,
} from "../letters-model";
import { useLettersHub } from "./use-letters-hub";

/**
 * Everything the Letters screen reads and does. Two adapters fill it: the letters data module in
 * the app (`LettersHubData`), fixtures in its dev states.
 */
export type LettersHub = {
	state: {
		status: LettersStatus;
		sent: readonly SentLetter[];
		received: readonly ReceivedLetter[];
		/** How the screen opens: Hidden · N expanded, or a withdraw being asked (dev states). */
		opens: { hidden: boolean; withdraw: string | null };
	};
	actions: {
		answerOffer: (optIn: Exclude<OptIn, "unset">) => void;
		/** "Turn on" after Not now. */
		turnOn: () => void;
		withdraw: (id: string) => void;
		/** A returned or late-held letter leaves Sent. */
		dismiss: (id: string) => void;
		/** These statuses are on screen now: their marks light once. */
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

/** The app's adapter. Until the data has loaded it draws `loading` instead of the screen. */
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
