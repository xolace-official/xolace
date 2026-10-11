import { useEffect, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import type { PurchasesPackage } from "react-native-purchases";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { appConfig } from "@/src/config/app";
import { useRevenueCat } from "@/src/features/purchases/revenuecat-context";
import { usePlusEntitlement } from "@/src/features/purchases/use-plus-entitlement";
import { usePaywall, type PaywallSurface } from "@/src/features/purchases/use-paywall";
import { PaywallHero } from "./paywall-hero";
import { PaywallFeatureSection } from "./paywall-feature-section";
import { PaywallFeatureItem } from "./paywall-feature-item";
import { PaywallPeriodPicker, type PlanId } from "./paywall-period-picker";
import { PaywallCta } from "./paywall-cta";
import { hasFreeTrial, paywallCtaLabel } from "./paywall-cta-label";
import { PaywallPlansUnavailable } from "./paywall-plans-unavailable";
import { PaywallCloseButton, PaywallRestoreButton } from "./paywall-header-actions";
import { ProgressiveBlurView } from "./progressive-blur-view";
import { PAYWALL_SURFACE_FEATURE, PAYWALL_SURFACE_LINE } from "./paywall-surface-map";
import {
  INSIGHTS_ICON,
  MIRROR_TONE_ICON,
  QUOTES_ICON,
  THEMES_ICON,
  AVATARS_ICON,
  TIMELINE_ICON,
  CAPS_ICON,
  AUDIO_ICON,
} from "./paywall-icons";

// Fallback display prices while offerings are unavailable
// (appConfig.features.payments=false, or RC still loading).
const FALLBACK = {
  annual: { price: "$49.99/yr", detail: "$4.17/mo, billed yearly", numericPrice: 49.99 },
  monthly: { price: "$9.99/mo", detail: "billed monthly", numericPrice: 9.99 },
} as const;

/** Why the paywall is closing — intake's `intake_completed` outcome hangs on it. */
export type PaywallExitReason = "purchased" | "dismissed";

type Props = {
  surface?: PaywallSurface;
  /**
   * The just-completed session a purchase should fulfil kindling for
   * (session-end's `kindling` surface, docs/paths-v1.md §12). Sent to
   * `paths.requestKindling` once the purchase confirms.
   */
  sessionId?: Id<"sessions">;
  /**
   * Where a dismiss or a completed purchase goes. Defaults to closing the
   * paywall route; intake overrides it to run its terminal step, since it has
   * no back edge to pop to.
   *
   * Called at most once per mount. Resolve `false` if the exit was swallowed
   * (intake's write can fail and leave the user on this screen) — that unlatches
   * the guard so the close button works again.
   */
  onExit?: (reason: PaywallExitReason) => void | Promise<boolean>;
};

export function PaywallScreen({ surface, sessionId, onExit }: Props) {
  const posthog = usePostHog();
  const defaultClose = usePaywall((s) => s.close);
  const closePaywall = onExit ?? (() => defaultClose());
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { offerings, purchase, isLoading, refreshOfferings } = useRevenueCat();
  const { isPlus } = usePlusEntitlement();
  const requestKindling = useMutation(api.paths.requestKindling);
  const { isAuthenticated } = useConvexAuth();
  const summary = useQuery(api.profile.getSummary, isAuthenticated ? {} : "skip");
  const [selected, setSelected] = useState<PlanId>("annual");
  const [busy, setBusy] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [ctaHeight, setCtaHeight] = useState(0);
  // Single-flight exit. Intake hangs its terminal step (the answers write, the
  // `intake_completed` event) off `onExit`, so a second call would persist and
  // track a second outcome — a dismiss racing the purchase that just landed, or
  // two taps on close. The ref is what actually guards: two presses in one frame
  // both read stale state.
  const exiting = useRef(false);
  const [isExiting, setIsExiting] = useState(false);

  const annualPkg = offerings?.current?.annual ?? null;
  const monthlyPkg = offerings?.current?.monthly ?? null;
  const highlightedFeature = surface ? PAYWALL_SURFACE_FEATURE[surface] : null;

  // Payments are live but the store gave us nothing to sell — the cold-start
  // fetch failed or the products didn't resolve. Never show a purchasable-
  // looking CTA in this state (App Review 2.1 "unresponsive button").
  const plansUnavailable =
    appConfig.features.payments && !annualPkg && !monthlyPkg;

  // Recover from a failed cold-start offerings fetch as soon as the paywall
  // opens, instead of waiting for the user to tap "Try again".
  useEffect(() => {
    if (!plansUnavailable || isLoading) return;
    refreshOfferings();
  }, [plansUnavailable, isLoading, refreshOfferings]);

  const handleRetry = () => {
    setRetrying(true);
    refreshOfferings().finally(() => setRetrying(false));
  };

  useEffect(() => {
    posthog.capture("paywall_opened", {
      surface: surface ?? null,
      session_count: summary?.sessionCount ?? null,
    });
    // Fire once on mount — summary is attribution detail, not a re-fire trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const priceOf = (pkg: PurchasesPackage | null, plan: PlanId) =>
    pkg
      ? { price: pkg.product.priceString, detail: FALLBACK[plan].detail }
      : FALLBACK[plan];

  const numericPriceOf = (pkg: PurchasesPackage | null, plan: PlanId) =>
    pkg ? pkg.product.price : FALLBACK[plan].numericPrice;

  const annualNumeric = numericPriceOf(annualPkg, "annual");
  const monthlyNumeric = numericPriceOf(monthlyPkg, "monthly");
  const discountPercent =
    monthlyNumeric > 0 ? Math.round((1 - annualNumeric / (monthlyNumeric * 12)) * 100) : null;

  const selectedPkg = selected === "annual" ? annualPkg : monthlyPkg;

  const exit = (reason: PaywallExitReason) => {
    if (exiting.current) return;
    exiting.current = true;
    setIsExiting(true);
    Promise.resolve(closePaywall(reason)).then((written) => {
      // Only intake reports back, and only to say the write was swallowed
      // (toast + stay put). Unlatch, or the close button is inert on a screen
      // with no back edge.
      if (written !== false) return;
      exiting.current = false;
      setIsExiting(false);
    });
  };

  const handleContinue = () => {
    if (!selectedPkg) return; // payments not live yet — CTA is a visual placeholder
    setBusy(true);
    purchase(selectedPkg, surface ?? undefined)
      .then((ok) => {
        if (!ok) return;
        // Best-effort: the server parks it until the webhook lands, so a
        // failure here only costs this one kindling, never the purchase.
        if (sessionId) requestKindling({ sessionId }).catch(console.error);
        exit("purchased"); // server entitlement query flips reactively
      })
      .finally(() => setBusy(false));
  };

  const trialAvailable = hasFreeTrial(selectedPkg);
  const ctaLabel = paywallCtaLabel(selected, selectedPkg);

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.View>
          <PaywallCloseButton
            surface={surface}
            sessionCount={summary?.sessionCount ?? null}
            onClose={onExit && (() => exit("dismissed"))}
            isDisabled={isExiting}
          />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View>
          <PaywallRestoreButton />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
      <View className="flex-1 bg-background">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.scrollContent,
            {
              // contentInsetAdjustmentBehavior handles this on iOS; Android's
              // ScrollView has no equivalent for a transparent native header.
              paddingTop: Platform.OS === "android" ? headerHeight + 16 : 0,
              paddingBottom: ctaHeight + 24,
            },
          ]}
        >
          <PaywallHero line={surface && PAYWALL_SURFACE_LINE[surface]} />

          <PaywallFeatureSection title="What starts showing up">
            <PaywallFeatureItem
              id="insights"
              icon={INSIGHTS_ICON}
              title="Pattern & language insights"
              description="The thing that keeps coming back, the third time instead of the thirtieth"
              isHighlighted={highlightedFeature === "insights"}
            />
            <PaywallFeatureItem
              id="mirror_tone"
              icon={MIRROR_TONE_ICON}
              title="Mirror voice & tone"
              description="Pick how it says things back — and it stays that way"
              isHighlighted={highlightedFeature === "mirror_tone"}
            />
            <PaywallFeatureItem
              id="quotes"
              icon={QUOTES_ICON}
              title="Personalized quotes"
              description="Your own words, handed back — and kept, in an archive that's yours"
              isHighlighted={highlightedFeature === "quotes"}
            />
            <PaywallFeatureItem
              id="audio"
              icon={AUDIO_ICON}
              title="Full audio catalog"
              description="Every guided track and song, unlocked"
              isHighlighted={highlightedFeature === "audio"}
            />
          </PaywallFeatureSection>

          <PaywallFeatureSection title="Make it yours">
            <PaywallFeatureItem
              id="themes"
              icon={THEMES_ICON}
              title="Premium themes"
              description="Five palettes - Noir, Emerald, Velvet, Rosé and Platinum"
              isHighlighted={highlightedFeature === "themes"}
            />
            <PaywallFeatureItem
              id="avatars"
              icon={AVATARS_ICON}
              title="Custom avatars"
              description="A face for the fire that isn't the default one"
              isHighlighted={highlightedFeature === "avatars"}
            />
            <PaywallFeatureItem
              id="timeline"
              icon={TIMELINE_ICON}
              title="Extended timeline"
              description="Every day, not just the recent ones"
              isHighlighted={highlightedFeature === "timeline"}
            />
            <PaywallFeatureItem
              id="caps"
              icon={CAPS_ICON}
              title="Higher daily limits"
              description="More reflections, vents, and message drafts per day"
              isHighlighted={highlightedFeature === "caps"}
            />
          </PaywallFeatureSection>
        </ScrollView>

        <ProgressiveBlurView position="top" height={insets.top + 60} />
        <ProgressiveBlurView position="bottom" height={ctaHeight + 100} />

        <View
          className="absolute bottom-0 left-0 right-0 px-5 gap-4"
          style={{ paddingBottom: insets.bottom + 12 }}
          onLayout={(e) => setCtaHeight(e.nativeEvent.layout.height)}
        >
          {plansUnavailable ? (
            <PaywallPlansUnavailable
              isRetrying={retrying || isLoading}
              onRetry={handleRetry}
            />
          ) : (
            <>
              <PaywallPeriodPicker
                annual={priceOf(annualPkg, "annual")}
                monthly={priceOf(monthlyPkg, "monthly")}
                discountPercent={discountPercent}
                hasFreeTrial={trialAvailable}
                selected={selected}
                onSelect={setSelected}
              />
              <PaywallCta
                label={ctaLabel}
                onPress={handleContinue}
                isBusy={busy}
                isDisabled={busy || isPlus || (appConfig.features.payments && !selectedPkg)}
              />
            </>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, gap: 32 },
});
