import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import type { PurchasesPackage } from "react-native-purchases";
import { appConfig } from "@/config/app";
import { hasFreeTrial } from "@/features/purchases/free-trial";
import { introOfferOf } from "@/features/purchases/intro-offer";
import type { PlanId } from "@/features/purchases/plans";
import { useRevenueCat } from "@/features/purchases/revenuecat-context";
import { useIntroEligibility } from "@/features/purchases/use-intro-eligibility";
import {
	type PaywallSurface,
	usePaywall,
} from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { PAYWALL } from "./copy";
import type { PaywallValue } from "./paywall-data";
import { planDetail } from "./paywall-plan-detail";
import {
	PAYWALL_SURFACE_FEATURE,
	PAYWALL_SURFACE_LINE,
} from "./paywall-surface-map";

export type PaywallExitReason = "purchased" | "dismissed";

export type PaywallProps = {
	surface?: PaywallSurface;
	companionName: string;
	sessionId?: Id<"sessions">;
	onExit?: (reason: PaywallExitReason) => void | Promise<boolean>;
};

const priceOf = (pkg: PurchasesPackage | null, plan: PlanId) =>
	pkg
		? {
				detail: planDetail(plan, pkg.product),
				price: `${pkg.product.priceString}/${plan === "annual" ? "yr" : "mo"}`,
			}
		: PAYWALL.fallback[plan];

/** The paywall's data hook: the store, the entitlement, analytics and the exit. */
export function usePaywallScreen({
	surface,
	sessionId,
	onExit,
	companionName,
}: PaywallProps): PaywallValue {
	const posthog = usePostHog();
	const defaultClose = usePaywall((s) => s.close);
	const closePaywall = onExit ?? (() => defaultClose());
	const { offerings, purchase, isLoading, refreshOfferings, restorePurchases } =
		useRevenueCat();
	const { isPlus } = usePlusEntitlement();
	const requestKindling = useMutation(api.paths.requestKindling);
	const { isAuthenticated } = useConvexAuth();
	const summary = useQuery(
		api.profile.getSummary,
		isAuthenticated ? {} : "skip"
	);
	const [selected, setSelected] = useState<PlanId>("annual");
	const [busy, setBusy] = useState(false);
	const [retrying, setRetrying] = useState(false);
	const exiting = useRef(false);
	const [isExiting, setIsExiting] = useState(false);

	const annualPkg = offerings?.current?.annual ?? null;
	const monthlyPkg = offerings?.current?.monthly ?? null;
	const monthlyIntroEligible = useIntroEligibility(
		monthlyPkg?.product.identifier ?? null
	);
	const monthlyIntro = introOfferOf(monthlyPkg?.product, monthlyIntroEligible);
	const annualIntroEligible = useIntroEligibility(
		annualPkg?.product.identifier ?? null
	);

	// Payments live but nothing to sell. Never show a purchasable-looking CTA here
	// (App Review 2.1 "unresponsive button").
	const plansUnavailable =
		appConfig.features.payments && !annualPkg && !monthlyPkg;

	useEffect(() => {
		if (!plansUnavailable || isLoading) {
			return;
		}
		refreshOfferings();
	}, [plansUnavailable, isLoading, refreshOfferings]);

	const retry = () => {
		setRetrying(true);
		refreshOfferings().finally(() => setRetrying(false));
	};

	useEffect(() => {
		posthog.capture("paywall_opened", {
			session_count: summary?.sessionCount ?? null,
			surface: surface ?? null,
		});
		// Fire once on mount; summary is attribution detail, not a re-fire trigger.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const selectedPkg = selected === "annual" ? annualPkg : monthlyPkg;

	const exit = (reason: PaywallExitReason) => {
		if (exiting.current) {
			return;
		}
		exiting.current = true;
		setIsExiting(true);
		Promise.resolve(closePaywall(reason)).then((written) => {
			if (written !== false) {
				return;
			}
			exiting.current = false;
			setIsExiting(false);
		});
	};

	const buy = () => {
		if (!selectedPkg) {
			return;
		}
		setBusy(true);
		purchase(selectedPkg, surface ?? undefined)
			.then((ok) => {
				if (!ok) {
					return;
				}
				if (sessionId) {
					requestKindling({ sessionId }).catch(console.error);
				}
				exit("purchased");
			})
			.finally(() => setBusy(false));
	};

	const dismiss = () => {
		posthog.capture("paywall_dismissed", {
			session_count: summary?.sessionCount ?? null,
			surface: surface ?? null,
		});
		if (onExit) {
			exit("dismissed");
		} else {
			defaultClose();
		}
	};

	const selectedEligible =
		selected === "annual" ? annualIntroEligible : monthlyIntroEligible;

	return {
		actions: {
			buy,
			dismiss,
			restore: restorePurchases,
			retry,
			select: setSelected,
		},
		state: {
			annual: priceOf(annualPkg, "annual"),
			busy,
			buyDisabled:
				busy || isPlus || (appConfig.features.payments && !selectedPkg),
			highlighted: surface ? PAYWALL_SURFACE_FEATURE[surface] : null,
			isExiting,
			line: surface
				? PAYWALL_SURFACE_LINE[surface]?.replace("{name}", companionName)
				: undefined,
			monthly: priceOf(monthlyPkg, "monthly"),
			monthlyIntro,
			plansUnavailable,
			retrying: retrying || isLoading,
			selected,
			trialAvailable: hasFreeTrial(selectedPkg, selectedEligible),
		},
	};
}
