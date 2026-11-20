import { createContext, type ReactNode, use } from "react";
import { useTellUs } from "./use-tell-us";

export type TellUs = {
	state: {
		text: string;
		sent: boolean;
		sending: boolean;
		limited: boolean;
	};
	actions: {
		setText: (text: string) => void;
		send: () => void;
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
