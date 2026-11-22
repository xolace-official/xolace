import { createContext, type ReactNode, use } from "react";
import type { COPY } from "../copy";
import { useFollowUp } from "./use-follow-up";

export type FollowUpSheet = {
	state: {
		open: boolean;
		question: (typeof COPY.followUp)["mid" | "high"];
	};
	actions: {
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
