import { api } from "@xolace/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import {
	createContext,
	use,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Platform } from "react-native";
import Purchases, {
	type CustomerInfo,
	LOG_LEVEL,
	type PurchasesOfferings,
	type PurchasesPackage,
} from "react-native-purchases";
import { toast } from "@/components/shared/toast";
import { appConfig } from "@/config/app";
import { playAffirmativePress } from "@/lib/haptics";
import { useAppStore } from "@/store/store";

function hasActiveEntitlement(customerInfo: CustomerInfo | null): boolean {
	if (!customerInfo) {
		return false;
	}
	return appConfig.monetization.entitlements.some(
		(id) => customerInfo.entitlements.active[id] !== undefined
	);
}

function getApiKey(): string {
	const keys = __DEV__
		? appConfig.monetization.revenueCatApiKeyTestStore
		: appConfig.monetization.revenueCatApiKey;
	return Platform.OS === "ios" ? keys.ios : keys.android;
}

type RevenueCatContextType = {
	customerInfo: CustomerInfo | null;
	offerings: PurchasesOfferings | null;
	isProUser: boolean;
	isLoading: boolean;
	purchase: (pkg: PurchasesPackage, surface?: string) => Promise<boolean>;
	restorePurchases: () => Promise<boolean>;
	refreshOfferings: () => Promise<boolean>;
};

const RevenueCatContext = createContext<RevenueCatContextType>({
	customerInfo: null,
	isLoading: true,
	isProUser: false,
	offerings: null,
	purchase: () => Promise.resolve(false),
	refreshOfferings: () => Promise.resolve(false),
	restorePurchases: () => Promise.resolve(false),
});

export function useRevenueCat() {
	return use(RevenueCatContext);
}

export function RevenueCatProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const posthog = usePostHog();
	const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
	const accountPending = useAppStore((s) => s.accountPending);
	const entitlement = useQuery(
		api.premium.getEntitlement,
		isAuthenticated && !accountPending ? {} : "skip"
	);
	const appUserId = entitlement?.appUserId ?? null;

	const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
	const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
	const [isLoading, setIsLoading] = useState(
		appConfig.features.payments && getApiKey() !== ""
	);
	const [configured, setConfigured] = useState(false);

	const isProUser = appConfig.features.payments
		? hasActiveEntitlement(customerInfo)
		: appConfig.devIsPlus;

	useEffect(() => {
		if (!appConfig.features.payments) {
			return;
		}

		if (!getApiKey()) {
			console.warn(
				"[RevenueCat] no API key for this build — set extra.revenueCat keys or flip appConfig.features.payments to false."
			);
			return;
		}

		let cancelled = false;
		async function init() {
			try {
				if (__DEV__) {
					Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
				}
				Purchases.configure({ apiKey: getApiKey() });

				const [info, offers] = await Promise.all([
					Purchases.getCustomerInfo(),
					Purchases.getOfferings(),
				]);
				if (cancelled) {
					return;
				}
				setCustomerInfo(info);
				setOfferings(offers);
				setConfigured(true);
			} catch (error) {
				console.error("[RevenueCat] init failed:", error);
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		}
		init();

		const listener = (info: CustomerInfo) => setCustomerInfo(info);
		Purchases.addCustomerInfoUpdateListener(listener);
		return () => {
			cancelled = true;
			Purchases.removeCustomerInfoUpdateListener(listener);
		};
	}, []);

	useEffect(() => {
		if (!(configured && appUserId)) {
			return;
		}
		Purchases.logIn(appUserId)
			.then(({ customerInfo: info }) => setCustomerInfo(info))
			.catch((error) => console.error("[RevenueCat] logIn failed:", error));
	}, [configured, appUserId]);

	useEffect(() => {
		if (!configured || isAuthLoading || isAuthenticated) {
			return;
		}
		let cancelled = false;
		Purchases.isAnonymous()
			.then((anonymous) => {
				if (anonymous || cancelled) {
					return null;
				}
				return Purchases.logOut();
			})
			.then((info) => {
				if (info && !cancelled) {
					setCustomerInfo(info);
				}
			})
			.catch((error) => console.error("[RevenueCat] logOut failed:", error));
		return () => {
			cancelled = true;
		};
	}, [configured, isAuthLoading, isAuthenticated]);

	const purchase = useCallback(
		async (pkg: PurchasesPackage, rawSurface?: string): Promise<boolean> => {
			const surface = rawSurface ?? null;
			posthog.capture("purchase_started", { package: pkg.identifier, surface });
			try {
				const { customerInfo: info } = await Purchases.purchasePackage(pkg);
				setCustomerInfo(info);

				if (hasActiveEntitlement(info)) {
					posthog.capture("purchase_completed", {
						package: pkg.identifier,
						surface,
					});
					playAffirmativePress();
					toast("Welcome to Xolace+", { description: "It's yours now." });
					return true;
				}
				return false;
			} catch (error: any) {
				if (error?.userCancelled) {
					posthog.capture("purchase_failed", {
						package: pkg.identifier,
						surface,
						userCancelled: true,
					});
					return false;
				}
				posthog.capture("purchase_failed", {
					errorCode: error?.code ?? null,
					package: pkg.identifier,
					surface,
				});
				console.error("[RevenueCat] purchase failed:", error);
				toast("Purchase didn't go through", {
					description: "Please try again.",
					variant: "danger",
				});
				return false;
			}
		},
		[posthog]
	);

	const refreshOfferings = useCallback(async (): Promise<boolean> => {
		if (!(appConfig.features.payments && getApiKey())) {
			return false;
		}
		try {
			const offers = await Purchases.getOfferings();
			setOfferings(offers);
			return (offers.current?.availablePackages.length ?? 0) > 0;
		} catch (error) {
			console.error("[RevenueCat] offerings refresh failed:", error);
			return false;
		}
	}, []);

	const restorePurchases = useCallback(async (): Promise<boolean> => {
		try {
			const info = await Purchases.restorePurchases();
			setCustomerInfo(info);

			if (hasActiveEntitlement(info)) {
				playAffirmativePress();
				toast("Purchases restored");
				return true;
			}
			toast("No active purchases found");
			return false;
		} catch (error) {
			console.error("[RevenueCat] restore failed:", error);
			toast("Restore failed", {
				description: "Please try again.",
				variant: "danger",
			});
			return false;
		}
	}, []);

	const value = useMemo(
		() => ({
			customerInfo,
			isLoading,
			isProUser,
			offerings,
			purchase,
			refreshOfferings,
			restorePurchases,
		}),
		[
			customerInfo,
			offerings,
			isProUser,
			isLoading,
			purchase,
			restorePurchases,
			refreshOfferings,
		]
	);

	return <RevenueCatContext value={value}>{children}</RevenueCatContext>;
}
