import { create } from "zustand";

export type AgeAskSurface = "letters";

export type AgeAsk = {
	error: unknown;
	surface: AgeAskSurface;
	retry: () => void;
};

export const useAgeAsk = create<{ ask: AgeAsk | null }>(() => ({ ask: null }));

export function askAge(ask: AgeAsk): void {
	useAgeAsk.setState({ ask });
}

export function ageAskTaken(): void {
	useAgeAsk.setState({ ask: null });
}
