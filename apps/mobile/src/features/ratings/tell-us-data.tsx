import { createContext, type ReactNode, use } from "react";
import { useTellUs } from "./use-tell-us";

/** Tell us: a note to the team, without the person's name. `TellUsData` sends it with `feedback.submit`. */
export type TellUs = {
	state: {
		text: string;
		/** Sent: the thank-you takes the form's place. */
		sent: boolean;
		sending: boolean;
		/** Today's note is already sent (`feedback.canSubmitGeneral`): the field locks. */
		limited: boolean;
	};
	actions: {
		setText: (text: string) => void;
		send: () => void;
		/** Cancel, and Done on the thank-you. */
		close: () => void;
	};
};

const TellUsContext = createContext<TellUs | null>(null);

export function TellUsProvider({
	value,
	children,
}: {
	value: TellUs;
	children: ReactNode;
}) {
	return <TellUsContext value={value}>{children}</TellUsContext>;
}

export function useTellUsSheet(): TellUs {
	const value = use(TellUsContext);
	if (!value) {
		throw new Error("useTellUsSheet needs a TellUsProvider");
	}
	return value;
}

export function TellUsData({ children }: { children: ReactNode }) {
	return <TellUsProvider value={useTellUs()}>{children}</TellUsProvider>;
}
