import { createContext, type ReactNode, use } from "react";
import { useRate } from "./use-rate";

export type Rate = {
	state: {
		rated: boolean;
	};
	actions: {
		rate: () => void;
		write: () => void;
		tellUs: () => void;
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
