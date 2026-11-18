import { createContext, type ReactNode, use } from "react";
import type { ArrivalPlan } from "@/features/achievements/arrival/arrival-model";
import { useArrivals } from "@/features/achievements/arrival/use-arrivals";

/**
 * What the arrival shows and what closing it does. Two adapters fill it: Convex
 * and the quiet-moment gate in the app (`ArrivalData`, in the arrivals host),
 * and fixtures in its dev states (`dev/states.tsx`), where it plays at once on
 * a route and closing goes back.
 */
export type Arrivals = {
	state: {
		/** What's staged: mounted hidden until `open`. */
		plan: ArrivalPlan | null;
		open: boolean;
	};
	actions: {
		/** It has faded out: stamp what it showed seen, and let the next one through. */
		closed: () => void;
		/** The backfill's "See them": to Achievements. */
		seeBadges: () => void;
	};
};

const ArrivalsContext = createContext<Arrivals | null>(null);

export function ArrivalsProvider({
	value,
	children,
}: {
	value: Arrivals;
	children: ReactNode;
}) {
	return <ArrivalsContext value={value}>{children}</ArrivalsContext>;
}

/** The app's adapter. */
export function ArrivalData({
	isPresented,
	children,
}: {
	isPresented: (pathname: string) => boolean;
	children: ReactNode;
}) {
	return (
		<ArrivalsProvider value={useArrivals(isPresented)}>
			{children}
		</ArrivalsProvider>
	);
}

export function useArrivalsState(): Arrivals {
	const value = use(ArrivalsContext);
	if (!value) {
		throw new Error("useArrivalsState needs an ArrivalsProvider above it");
	}
	return value;
}
