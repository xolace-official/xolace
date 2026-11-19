import type { ReactNode } from "react";
import { createContext, use } from "react";
import type { WaitingCard } from "./coming-back-model";
import type { Answer, CheckInPick, Place } from "./copy";
import { useCheckInData } from "./use-check-in";

/**
 * Everything the check-in reads and does. `CheckInData` fills it from the episode and Convex; a
 * dev state from fixtures. The answer is saved at the tap; closing before one saves nothing.
 */
export type CheckIn = {
	state: {
		/** The card this check-in answers (null: opened without one, it closes). */
		card: WaitingCard | null;
		question: string;
		/** The answers on the cards, in order (acute: two). */
		picks: readonly CheckInPick[];
		picked: Answer | null;
		/** Acute or from an escalation: no sharing, and "Resources are still here" shows. */
		careful: boolean;
		note: string;
		/** The share toggle (the account's contribute-by-default until it's touched). */
		share: boolean;
		saving: boolean;
		/** The streak nod under the reflective step; null with no streak. */
		nod: string | null;
		reduced: boolean;
	};
	actions: {
		pick: (answer: CheckInPick) => void;
		/** Let it out: answered "vent", and on to Vent. */
		vent: () => void;
		/** Crisis help, over the check-in. */
		resources: () => void;
		/** A place from a still-here or heavier step. */
		go: (place: Place) => void;
		setNote: (note: string) => void;
		setShare: (share: boolean) => void;
		/** Done on the reflective step: saves the words (if any), then leaves. */
		done: () => void;
		/** The close button, Skip for now, Not now: leaves (and the row ticks if answered). */
		close: () => void;
		/** The sheet started closing some other way (a swipe). */
		leaving: () => void;
	};
};

const CheckInContext = createContext<CheckIn | null>(null);

export function CheckInProvider({
	value,
	children,
}: {
	value: CheckIn;
	children: ReactNode;
}) {
	return <CheckInContext value={value}>{children}</CheckInContext>;
}

export function useCheckIn(): CheckIn {
	const value = use(CheckInContext);
	if (!value) {
		throw new Error("useCheckIn outside CheckInData");
	}
	return value;
}

/** The app's adapter: the check-in on the episode store and Convex. */
export function CheckInData({ children }: { children: ReactNode }) {
	return <CheckInProvider value={useCheckInData()}>{children}</CheckInProvider>;
}
