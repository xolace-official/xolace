import { createContext, type ReactNode, use } from "react";
import { useRate } from "./use-rate";

export type RateConversation = {
	counterpartName: string;
	counterpartPhotoUrl?: string;
	myRating?: number;
};

export type RateScreenData = {
	/** `undefined` while loading; `null` when there is nothing to rate. */
	state: { conversation: RateConversation | null | undefined };
	actions: { send: (rating: number) => void; skip: () => void };
};

const Context = createContext<RateScreenData | null>(null);

export function RateProvider({
	value,
	children,
}: {
	value: RateScreenData;
	children: ReactNode;
}) {
	return <Context value={value}>{children}</Context>;
}

export function RateData({
	conversationId,
	children,
}: {
	conversationId: string;
	children: ReactNode;
}) {
	return (
		<RateProvider value={useRate(conversationId)}>{children}</RateProvider>
	);
}

export function useRateScreen(): RateScreenData {
	const value = use(Context);
	if (!value) {
		throw new Error("useRateScreen outside RateData");
	}
	return value;
}
