import { createContext, type ReactNode, use } from "react";
import type { PlanId, Plans } from "@/features/purchases/plans";
import { type FeatureRow, featureRows, surfaceLine } from "./plus-model";
import { type PlusOptions, usePlus } from "./use-plus";

/**
 * Everything the Xolace+ paywall reads and does. Two adapters fill it: RevenueCat, Convex and
 * PostHog in the app (`PlusData`) and sample plans in its dev states (`dev/`). No part calls a
 * data hook itself, so a tap in a dev state never reaches the store.
 */
export type Plus = {
	state: {
		/** The surface's own line under the title, if it has one. */
		line: string | null;
		features: FeatureRow[];
		plans: Plans;
		/** Payments are live but the store sold nothing: no purchasable-looking button. */
		unavailable: boolean;
		retrying: boolean;
		buying: boolean;
		restoring: boolean;
		/** Xolace+ is theirs already. */
		owned: boolean;
		/** Leaving: nothing on the screen may be tapped again. */
		exiting: boolean;
	};
	actions: {
		buy: (plan: PlanId) => void;
		restore: () => void;
		retry: () => void;
		/** Continue free: `paywall_dismissed`, then out. */
		leave: () => void;
	};
};

const PlusContext = createContext<Plus | null>(null);

export function PlusProvider({
	value,
	children,
}: {
	value: Plus;
	children: ReactNode;
}) {
	return <PlusContext value={value}>{children}</PlusContext>;
}

/** The app's adapter. `companionName` comes from the route, so `plus` never imports talk. */
export function PlusData({
	children,
	companionName,
	...options
}: PlusOptions & { companionName: string; children: ReactNode }) {
	const { state, actions } = usePlus(options);
	const value: Plus = {
		actions,
		state: {
			...state,
			features: featureRows(options.surface),
			line: surfaceLine(options.surface, companionName),
		},
	};
	return <PlusProvider value={value}>{children}</PlusProvider>;
}

export function usePlusScreen(): Plus {
	const value = use(PlusContext);
	if (!value) {
		throw new Error("usePlusScreen outside PlusProvider");
	}
	return value;
}
