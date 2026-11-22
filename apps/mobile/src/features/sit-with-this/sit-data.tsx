import { createContext, type ReactNode, use } from "react";
import type { Exercise, SitFrom } from "./sit-model";
import { useSitData } from "./use-sit";

export type Sit = {
	state: {
		status: "loading" | "empty" | "ready";
		exercise: Exercise | null;
		from: SitFrom;
		swaps: number;
		late: boolean;
	};
	actions: {
		begin: () => void;
		finish: (completed: boolean) => void;
		openSwap: () => void;
	};
};

const SitContext = createContext<Sit | null>(null);

export function SitProvider({
	value,
	children,
}: {
	value: Sit;
	children: ReactNode;
}) {
	return <SitContext value={value}>{children}</SitContext>;
}

export function useSit(): Sit {
	const sit = use(SitContext);
	if (!sit) {
		throw new Error("useSit needs a SitProvider above it");
	}
	return sit;
}

export function SitData({ children }: { children: ReactNode }) {
	const value = useSitData();
	return <SitProvider value={value}>{children}</SitProvider>;
}
