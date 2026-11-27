import { createContext, type ReactNode, use } from "react";
import type { IntroOffer } from "@/features/purchases/intro-offer";
import type { PlanId } from "@/features/purchases/plans";
import type { PaywallFeatureId } from "./paywall-surface-map";
import { type PaywallProps, usePaywallScreen } from "./use-paywall-screen";

type PlanPrice = { price: string; detail: string };

export type PaywallValue = {
	actions: {
		buy: () => void;
		dismiss: () => void;
		restore: () => Promise<unknown>;
		retry: () => void;
		select: (plan: PlanId) => void;
	};
	state: {
		annual: PlanPrice;
		busy: boolean;
		buyDisabled: boolean;
		highlighted: PaywallFeatureId | null;
		isExiting: boolean;
		/** The surface's own line under the title; the default line when undefined. */
		line: string | undefined;
		monthly: PlanPrice;
		monthlyIntro: IntroOffer | null;
		plansUnavailable: boolean;
		retrying: boolean;
		selected: PlanId;
		trialAvailable: boolean;
	};
};

const PaywallContext = createContext<PaywallValue | null>(null);

export function usePaywallData(): PaywallValue {
	const value = use(PaywallContext);
	if (!value) {
		throw new Error("usePaywallData needs a PaywallProvider above it");
	}
	return value;
}

function PaywallProvider({
	children,
	value,
}: {
	children: ReactNode;
	value: PaywallValue;
}) {
	return <PaywallContext value={value}>{children}</PaywallContext>;
}

export function PaywallData({
	children,
	...props
}: PaywallProps & { children: ReactNode }) {
	const value = usePaywallScreen(props);
	return <PaywallProvider value={value}>{children}</PaywallProvider>;
}
