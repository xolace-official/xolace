import { createContext, type ReactNode, use } from "react";
import type { ArrivalPlan } from "@/features/achievements/arrival/arrival-model";
import { useArrivals } from "@/features/achievements/arrival/use-arrivals";

export type Arrivals = {
	state: {
		plan: ArrivalPlan | null;
		open: boolean;
	};
	actions: {
		closed: () => void;
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
