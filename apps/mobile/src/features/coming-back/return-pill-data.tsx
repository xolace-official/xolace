import { createContext, type ReactNode, use } from "react";
import { useReturnPill as useReturnPillData } from "./use-coming-back";

/** What Today's return pill reads and does (handoff §8). */
export type ReturnPill = {
	state: {
		/** The pill's words, or null when it doesn't show (nothing waits, or the greeting is up or due). */
		label: string | null;
		/** Which dots it carries. */
		ck: boolean;
		pm: boolean;
		/** Bumped each time the greeting closes, so the pill rises again. */
		closeKey: number;
		reduced: boolean;
	};
	actions: {
		/** Reopens the greeting as "Still here.", with only what waits. */
		open: () => void;
	};
};

const ReturnPillContext = createContext<ReturnPill | null>(null);

export function ReturnPillProvider({
	value,
	children,
}: {
	value: ReturnPill;
	children: ReactNode;
}) {
	return <ReturnPillContext value={value}>{children}</ReturnPillContext>;
}

export function useReturnPill(): ReturnPill {
	const value = use(ReturnPillContext);
	if (!value) {
		throw new Error("useReturnPill outside ReturnPillData");
	}
	return value;
}

/** The app's adapter: the pill on the episode store. */
export function ReturnPillData({ children }: { children: ReactNode }) {
	return (
		<ReturnPillProvider value={useReturnPillData()}>
			{children}
		</ReturnPillProvider>
	);
}
