import type { Href } from "expo-router";
import { createContext, type ReactNode, use } from "react";
import type { AgeGateStep, AgeGateSurface } from "./age-gate-step";
import { useAgeSheet } from "./use-age-sheet";

export type AgeSheetState = {
	step: AgeGateStep;
	surface: AgeGateSurface;
	dateOfBirth: string | null;
	saving: boolean;
};

export type AgeSheetScreenData = {
	state: AgeSheetState;
	actions: {
		setDateOfBirth: (day: string) => void;
		submit: () => void;
		decline: () => void;
		close: () => void;
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
