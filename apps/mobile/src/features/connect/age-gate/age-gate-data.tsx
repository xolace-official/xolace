import type { Href } from "expo-router";
import { createContext, type ReactNode, use } from "react";
import type { AgeGateStep, AgeGateSurface } from "./age-gate-step";
import { useAgeSheet } from "./use-age-sheet";

export type AgeSheetState = {
	step: AgeGateStep;
	surface: AgeGateSurface;
	/** "YYYY-MM-DD" once the wheel has been turned. */
	dateOfBirth: string | null;
	saving: boolean;
};

/** Everything the age gate's sheet reads and does. Convex fills it in the app (`AgeSheetData`),
 * fixtures in its dev states. */
export type AgeSheetScreenData = {
	state: AgeSheetState;
	actions: {
		setDateOfBirth: (day: string) => void;
		submit: () => void;
		decline: () => void;
		/** OK: closes the sheet. */
		close: () => void;
		/** A way on: closes the sheet, then goes. */
		go: (href: Href) => void;
	};
};

const Context = createContext<AgeSheetScreenData | null>(null);

export function AgeSheetProvider({
	value,
	children,
}: {
	value: AgeSheetScreenData;
	children: ReactNode;
}) {
	return <Context value={value}>{children}</Context>;
}

/** Fills the sheet from the waiting request and Convex. */
export function AgeSheetData({ children }: { children: ReactNode }) {
	return <AgeSheetProvider value={useAgeSheet()}>{children}</AgeSheetProvider>;
}

export function useAgeSheetScreen(): AgeSheetScreenData {
	const value = use(Context);
	if (!value) {
		throw new Error("useAgeSheetScreen needs an AgeSheetProvider");
	}
	return value;
}
