import { createContext, type ReactNode, use } from "react";
import type { Exercise, SitFrom } from "./sit-model";
import { useSitData } from "./use-sit";

/**
 * Everything Sit with this reads and does. Two adapters fill it: Convex in the
 * app (`SitData`) and fixtures in its dev states (`dev/`). The run itself
 * (beats, pause, the breath) is screen state; only what is read from the
 * backend, saved or navigated comes through here.
 */
export type Sit = {
	state: {
		status: "loading" | "empty" | "ready";
		/** The session's exercise, matched or swapped; a swap changes its `key`. */
		exercise: Exercise | null;
		from: SitFrom;
		/** Swaps used in this session (two at most). */
		swaps: number;
		/** The night window: dusk, ember light, the ember face. */
		late: boolean;
	};
	actions: {
		/** Done (true) or leaving early (false): records the path, then the session end. */
		finish: (completed: boolean) => void;
		/** "Something different": the swap sheet, over the paused exercise. */
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

/** The app's adapter: Sit on Convex and the router. */
export function SitData({ children }: { children: ReactNode }) {
	const value = useSitData();
	return <SitProvider value={value}>{children}</SitProvider>;
}
