import { createContext, type ReactNode, use } from "react";
import type { PeersSet } from "./copy";
import type { PeerCard } from "./peer-reflection-model";
import { usePeerReflectionData } from "./use-peer-reflection";

export type PeerReflection = {
	state: {
		status: "loading" | "ready";
		set: PeersSet;
		cards: PeerCard[];
		bridge: boolean;
		late: boolean;
	};
	actions: {
		toggle: (id: string) => void;
		report: (id: string) => void;
		hide: (id: string) => void;
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

export function PeerReflectionData({ children }: { children: ReactNode }) {
	const value = usePeerReflectionData();
	return (
		<PeerReflectionProvider value={value}>{children}</PeerReflectionProvider>
	);
}
