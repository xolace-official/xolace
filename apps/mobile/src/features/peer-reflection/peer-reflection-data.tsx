import { createContext, type ReactNode, use } from "react";
import type { PeersSet } from "./copy";
import type { PeerCard } from "./peer-reflection-model";
import { usePeerReflectionData } from "./use-peer-reflection";

/**
 * Everything You're not alone reads and does. Two adapters fill it: Convex in
 * the app (`PeerReflectionData`) and fixtures in its dev states (`dev/`). The
 * arrival, the mark and the face are screen state; only what is read from the
 * backend, sent or navigated comes through here.
 */
export type PeerReflection = {
	state: {
		status: "loading" | "ready";
		/** Which results: a close match, recent ones, or none yet. */
		set: PeersSet;
		/** At most four, in the order the visit first showed them. */
		cards: PeerCard[];
		/** Session end will offer "Leave it for someone": the bridge line shows. */
		bridge: boolean;
		/** The night window: dusk, ember light, the ember face. */
		late: boolean;
	};
	actions: {
		/** "I've felt this too", on or off: flips at once, flips back if the server says slow down. */
		toggle: (id: string) => void;
		/** Opens the report sheet for this card. */
		report: (id: string) => void;
		/** Folds the card away for you only. */
		hide: (id: string) => void;
		/** Records the path, then the session end. */
		done: () => void;
	};
};

const PeerReflectionContext = createContext<PeerReflection | null>(null);

export function PeerReflectionProvider({
	value,
	children,
}: {
	value: PeerReflection;
	children: ReactNode;
}) {
	return (
		<PeerReflectionContext value={value}>{children}</PeerReflectionContext>
	);
}

export function usePeerReflection(): PeerReflection {
	const value = use(PeerReflectionContext);
	if (!value) {
		throw new Error(
			"usePeerReflection needs a PeerReflectionProvider above it"
		);
	}
	return value;
}

/** The app's adapter: You're not alone on Convex and the router. */
export function PeerReflectionData({ children }: { children: ReactNode }) {
	const value = usePeerReflectionData();
	return (
		<PeerReflectionProvider value={value}>{children}</PeerReflectionProvider>
	);
}
