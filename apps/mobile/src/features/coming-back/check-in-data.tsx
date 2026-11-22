import type { ReactNode } from "react";
import { createContext, use } from "react";
import type { WaitingCard } from "./coming-back-model";
import type { Answer, CheckInPick, Place } from "./copy";
import { useCheckInData } from "./use-check-in";

export type CheckIn = {
	state: {
		card: WaitingCard | null;
		question: string;
		picks: readonly CheckInPick[];
		picked: Answer | null;
		careful: boolean;
		note: string;
		share: boolean;
		saving: boolean;
		nod: string | null;
		reduced: boolean;
	};
	actions: {
		pick: (answer: CheckInPick) => void;
		vent: () => void;
		resources: () => void;
		go: (place: Place) => void;
		setNote: (note: string) => void;
		setShare: (share: boolean) => void;
		done: () => void;
		close: () => void;
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

export function CheckInData({ children }: { children: ReactNode }) {
	return <CheckInProvider value={useCheckInData()}>{children}</CheckInProvider>;
}
