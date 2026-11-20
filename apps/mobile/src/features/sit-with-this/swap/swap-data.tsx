import { createContext, type ReactNode, use } from "react";
import type { SwapChoice } from "../sit-model";
import { useSwapSheetData } from "./use-swap-sheet";

export type SwapSheet = {
	state: {
		choices: SwapChoice[];
		swaps: number;
		busy: boolean;
		loading: boolean;
	};
	actions: {
		pick: (id: string) => void;
		keepGoing: () => void;
	};
};

const SwapSheetContext = createContext<SwapSheet | null>(null);

export function SwapSheetProvider({
	value,
	children,
}: {
	value: SwapSheet;
	children: ReactNode;
}) {
	return <SwapSheetContext value={value}>{children}</SwapSheetContext>;
}

export function useSwapSheet(): SwapSheet {
	const sheet = use(SwapSheetContext);
	if (!sheet) {
		throw new Error("useSwapSheet needs a SwapSheetProvider above it");
	}
	return sheet;
}

export function SwapSheetData({ children }: { children: ReactNode }) {
	const value = useSwapSheetData();
	return <SwapSheetProvider value={value}>{children}</SwapSheetProvider>;
}
