import { createContext, type ReactNode, use } from "react";
import type { SwapChoice } from "../sit-model";
import { useSwapSheetData } from "./use-swap-sheet";

/**
 * What "Something else?" reads and does: the two options with their names and
 * lengths, and how many swaps are left. Convex in the app (`SwapSheetData`),
 * fixtures in its dev state. The exercise behind it waits while it's open.
 */
export type SwapSheet = {
	state: {
		choices: SwapChoice[];
		swaps: number;
		/** A swap is being recorded: the options don't take a second tap. */
		busy: boolean;
		/** The options aren't in yet: their rows hold the space. */
		loading: boolean;
	};
	actions: {
		/** Record the swap; the exercise restarts at its first beat. */
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

/** The app's adapter. */
export function SwapSheetData({ children }: { children: ReactNode }) {
	const value = useSwapSheetData();
	return <SwapSheetProvider value={value}>{children}</SwapSheetProvider>;
}
