/**
 * The date-of-birth ask for a feature that can't draw Connect's age gate itself (Letters: it
 * never imports another feature). A data hook hands over the server's age refusal here; the age
 * gate's host (`features/connect/age-gate/age-ask-host.tsx`) opens the sheet, declaring with the
 * refusal's `surface`, and runs `retry` after an adult answer.
 */
import { create } from "zustand";

/** The surfaces besides Connect's own that may ask (`age.declarations.declare`'s `surface`). */
export type AgeAskSurface = "letters";

export type AgeAsk = {
	error: unknown;
	surface: AgeAskSurface;
	/** Runs after an adult answer; a send passes none (the writer sends again). */
	retry: () => void;
};

export const useAgeAsk = create<{ ask: AgeAsk | null }>(() => ({ ask: null }));

/** Opens the age gate for a refusal the caller already knows is about age. */
export function askAge(ask: AgeAsk): void {
	useAgeAsk.setState({ ask });
}

/** The host took the ask. */
export function ageAskTaken(): void {
	useAgeAsk.setState({ ask: null });
}
