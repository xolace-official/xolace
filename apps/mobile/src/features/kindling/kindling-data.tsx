import { createContext, type ReactNode, use } from "react";
import type { TrailView } from "./kindling-model";
import { useKindlingData } from "./use-kindling";

export type Kindling = {
	state: {
		status: "loading" | "offline" | "none" | "ready";
		view: TrailView | null;
		held: string;
		matching: string | null;
	};
	actions: {
		open: (id: string, again: boolean) => void;
		tend: (id: string) => Promise<boolean>;
		skip: (id: string) => Promise<boolean>;
		browse: (id: string) => void;
		putOut: () => void;
		back: () => void;
	};
};

const KindlingContext = createContext<Kindling | null>(null);

export function KindlingProvider({
	value,
	children,
}: {
	value: Kindling;
	children: ReactNode;
}) {
	return <KindlingContext value={value}>{children}</KindlingContext>;
}

export function useKindling(): Kindling {
	const value = use(KindlingContext);
	if (!value) {
		throw new Error("useKindling needs a KindlingProvider above it");
	}
	return value;
}

export function KindlingData({ children }: { children: ReactNode }) {
	const value = useKindlingData();
	return <KindlingProvider value={value}>{children}</KindlingProvider>;
}
