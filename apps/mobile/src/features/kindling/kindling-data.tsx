import { createContext, type ReactNode, use } from "react";
import type { TrailView } from "./kindling-model";
import { useKindlingData } from "./use-kindling";

/**
 * Everything the kindling screen reads and does. Two adapters fill it: Convex in the app
 * (`KindlingData`) and fixtures in its dev states (`dev/`). Which stop is open, the undo window
 * and what the stops have shown are screen state (`use-trail.ts`); only what is read from the
 * backend, sent or navigated comes through here.
 */
export type Kindling = {
	state: {
		/** Offline: the read waits for a socket that isn't coming. */
		status: "loading" | "offline" | "none" | "ready";
		/** The kindling, kept on screen after its last twig settles (§5). */
		view: TrailView | null;
		/** "Tuesday", or "your last session". */
		held: string;
		/** A xolacer twig whose match is in flight: its button says so and holds. */
		matching: string | null;
	};
	actions: {
		/** Begin, Play, Write, See who, and the "again" button: the twig's own screen. */
		open: (id: string, again: boolean) => void;
		/** "I did this" (try): true once the server has it. */
		tend: (id: string) => Promise<boolean>;
		/** Not for me, once its undo window closes: true once the server has it. */
		skip: (id: string) => Promise<boolean>;
		/** "Browse more like this": the bound track's topic, one-off listening. */
		browse: (id: string) => void;
		/** Put it out, after the alert: back to Today first, then the server. */
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

/** The app's adapter: the kindling on Convex and the router. */
export function KindlingData({ children }: { children: ReactNode }) {
	const value = useKindlingData();
	return <KindlingProvider value={value}>{children}</KindlingProvider>;
}
