import { createContext, type ReactNode, use } from "react";
import type { COPY } from "../copy";
import { useFollowUp } from "./use-follow-up";

/** The heavier follow-up sheet: its question and rows, and the one tap that answers it. */
export type FollowUpSheet = {
	state: {
		/** The session end has it open; false once answered or when opened stale. */
		open: boolean;
		question: (typeof COPY.followUp)["mid" | "high"];
	};
	actions: {
		/** A row's key, or null for Not now and a swipe down. */
		answer: (key: string | null) => void;
	};
};

const FollowUpContext = createContext<FollowUpSheet | null>(null);

function FollowUpProvider({
	value,
	children,
}: {
	value: FollowUpSheet;
	children: ReactNode;
}) {
	return <FollowUpContext value={value}>{children}</FollowUpContext>;
}

/** The app's adapter: the answer goes to Convex. */
export function FollowUpData({ children }: { children: ReactNode }) {
	return <FollowUpProvider value={useFollowUp()}>{children}</FollowUpProvider>;
}

export function useFollowUpSheet(): FollowUpSheet {
	const value = use(FollowUpContext);
	if (!value) {
		throw new Error("useFollowUpSheet needs a FollowUpProvider above it");
	}
	return value;
}
