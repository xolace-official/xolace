import { createContext, type ReactNode, use } from "react";
import { useRate } from "./use-rate";

/**
 * "Help someone find Xolace": what it shows and does. `RateData` fills it from the store prompt,
 * the review link and the app store; a dev state from fixtures.
 */
export type Rate = {
	state: {
		/** Rate was pressed: the pill is Write a review, with the thank-you line. */
		rated: boolean;
	};
	actions: {
		/** Asks the store's own rating prompt (it may not show: the store decides). */
		rate: () => void;
		/** Opens the store page on writing a review. */
		write: () => void;
		/** The Tell us sheet. */
		tellUs: () => void;
		/** Back to where the open began (past What's New, if it came first). */
		close: () => void;
	};
};

const RateContext = createContext<Rate | null>(null);

export function RateProvider({
	value,
	children,
}: {
	value: Rate;
	children: ReactNode;
}) {
	return <RateContext value={value}>{children}</RateContext>;
}

export function useRateScreen(): Rate {
	const value = use(RateContext);
	if (!value) {
		throw new Error("useRateScreen needs a RateProvider");
	}
	return value;
}

export function RateData({ children }: { children: ReactNode }) {
	return <RateProvider value={useRate()}>{children}</RateProvider>;
}
