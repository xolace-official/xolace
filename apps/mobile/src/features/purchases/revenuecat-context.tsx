/**
 * RevenueCatContext — manages in-app purchases via RevenueCat.
 *
 * Handles SDK initialization, subscription status, purchasing, and restore.
 * Only activates when `appConfig.features.payments` is true; while false the
 * provider is inert (no SDK configure, no network) and `appConfig.devIsPlus`
 * acts as the local free/plus switch.
 *
 * In development (__DEV__), uses the test store API key for quick testing.
 * In production, uses the platform-specific production API key.
 *
 * Entitlements are read from `appConfig.monetization.entitlements` — the user
 * is considered Plus if ANY of those entitlements is active.
 *
 * Identity: after Convex auth resolves we call `Purchases.logIn(appUserId)`
 * with `appUserId = emotionalProfileId` from api.premium.getEntitlement — the
 * same id the server checks entitlements with (see gating-plan ID convention).
 * On sign-out we call `Purchases.logOut()` (guarded by isAnonymous) so a
 * later sign-in on the same device starts from a clean anonymous SDK state.
 */

import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { useConvexAuth, useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useToast } from "heroui-native";
import Purchases, {
  type CustomerInfo,
  LOG_LEVEL,
  type PurchasesOfferings,
  type PurchasesPackage,
} from "react-native-purchases";
import { api } from "@/convex/_generated/api";
import { appConfig } from "@/src/config/app";
import { playAffirmativePress, playErrorNotice } from "@/src/lib/haptics";

function hasActiveEntitlement(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) return false;
  return appConfig.monetization.entitlements.some(
    (id) => customerInfo.entitlements.active[id] !== undefined,
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

export const RevenueCatContext = createContext<RevenueCatContextType>({
  customerInfo: null,
  offerings: null,
  isProUser: false,
  isLoading: true,
  purchase: () => Promise.resolve(false),
  restorePurchases: () => Promise.resolve(false),
  refreshOfferings: () => Promise.resolve(false),
});

export function useRevenueCat() {
  return use(RevenueCatContext);
}

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const posthog = usePostHog();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const entitlement = useQuery(
    api.premium.getEntitlement,
    isAuthenticated ? {} : "skip",
  );
  const appUserId = entitlement?.appUserId ?? null;

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  // Only loading when the SDK will actually be configured (payments on AND a
  // key exists for this build) — keeps the no-key branch effect-free.
  const [isLoading, setIsLoading] = useState(
    appConfig.features.payments && getApiKey() !== "",
  );
  const [configured, setConfigured] = useState(false);

  // While payments are off the SDK is never touched — devIsPlus is the switch.
  const isProUser = appConfig.features.payments
    ? hasActiveEntitlement(customerInfo)
    : appConfig.devIsPlus;

  // Initialize SDK once payments are enabled.
  useEffect(() => {
    if (!appConfig.features.payments) return;

    if (!getApiKey()) {
      console.warn(
        "[RevenueCat] no API key for this build — set extra.revenueCat keys or flip appConfig.features.payments to false.",
      );
      return;
    }

    let cancelled = false;
    async function init() {
      try {
        if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
        Purchases.configure({ apiKey: getApiKey() });

        const [info, offers] = await Promise.all([
          Purchases.getCustomerInfo(),
          Purchases.getOfferings(),
        ]);
        if (cancelled) return;
        setCustomerInfo(info);
        setOfferings(offers);
        setConfigured(true);
      } catch (error) {
        console.error("[RevenueCat] init failed:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    init();

    // Listen for subscription changes (renewal, expiration, family sharing).
    const listener = (info: CustomerInfo) => setCustomerInfo(info);
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      cancelled = true;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  // Identity: RC appUserId = emotionalProfileId, matching the server checks.
  useEffect(() => {
    if (!configured || !appUserId) return;
    Purchases.logIn(appUserId)
      .then(({ customerInfo: info }) => setCustomerInfo(info))
      .catch((error) => console.error("[RevenueCat] logIn failed:", error));
  }, [configured, appUserId]);

  // Identity: on sign-out, detach the SDK from the previous user so their
  // cached entitlements can't leak to whoever signs in next on this device.
  useEffect(() => {
    if (!configured || isAuthLoading || isAuthenticated) return;
    let cancelled = false;
    Purchases.isAnonymous()
      .then((anonymous) => {
        if (anonymous || cancelled) return null;
        return Purchases.logOut();
      })
      .then((info) => {
        if (info && !cancelled) setCustomerInfo(info);
      })
      .catch((error) => console.error("[RevenueCat] logOut failed:", error));
    return () => {
      cancelled = true;
    };
  }, [configured, isAuthLoading, isAuthenticated]);

  // useCallback keeps the memoized Provider value stable (context exception).
  const purchase = useCallback(async (pkg: PurchasesPackage, rawSurface?: string): Promise<boolean> => {
    const surface = rawSurface ?? null;
    posthog.capture("purchase_started", { package: pkg.identifier, surface });
    try {
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info);

      if (hasActiveEntitlement(info)) {
        posthog.capture("purchase_completed", { package: pkg.identifier, surface });
        playAffirmativePress();
        toast.show({ label: "Welcome to Xolace+", description: "It's yours now." });
        return true;
      }
      return false;
    } catch (error: any) {
      if (error?.userCancelled) {
        posthog.capture("purchase_failed", {
          package: pkg.identifier, surface, userCancelled: true,
        });
        return false;
      }
      posthog.capture("purchase_failed", {
        package: pkg.identifier, surface, errorCode: error?.code ?? null,
      });
      console.error("[RevenueCat] purchase failed:", error);
      playErrorNotice();
      toast.show({
        variant: "danger",
        label: "Purchase didn't go through",
        description: "Please try again.",
      });
      return false;
    }
  }, [posthog, toast]);


  const refreshOfferings = useCallback(async (): Promise<boolean> => {
    if (!appConfig.features.payments || !getApiKey()) return false;
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
        toast.show({ label: "Purchases restored" });
        return true;
      }
      toast.show({ label: "No active purchases found" });
      return false;
    } catch (error) {
      console.error("[RevenueCat] restore failed:", error);
      playErrorNotice();
      toast.show({
        variant: "danger",
        label: "Restore failed",
        description: "Please try again.",
      });
      return false;
    }
  }, [toast]);


  const value = useMemo(
    () => ({ customerInfo, offerings, isProUser, isLoading, purchase, restorePurchases, refreshOfferings }),
    [customerInfo, offerings, isProUser, isLoading, purchase, restorePurchases, refreshOfferings],
  );

  return <RevenueCatContext value={value}>{children}</RevenueCatContext>;
}
