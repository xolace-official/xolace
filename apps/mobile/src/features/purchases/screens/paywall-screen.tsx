import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Stack } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { appConfig } from "@/config/app";
import { useRevenueCat } from "@/features/purchases/revenuecat-context";
import { useIntroEligibility } from "@/features/purchases/use-intro-eligibility";
import {
	type PaywallSurface,
	usePaywall,
} from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { PaywallCta } from "./paywall-cta";
import { hasFreeTrial, paywallCtaLabel } from "./paywall-cta-label";
import { PaywallFeatureItem } from "./paywall-feature-item";
import { PaywallFeatureSection } from "./paywall-feature-section";
import {
	PaywallCloseButton,
	PaywallRestoreButton,
} from "./paywall-header-actions";
import { PaywallHero } from "./paywall-hero";
import {
	AUDIO_ICON,
	AVATARS_ICON,
	CAPS_ICON,
	INSIGHTS_ICON,
	MIRROR_TONE_ICON,
	QUOTES_ICON,
	THEMES_ICON,
	TIMELINE_ICON,
} from "./paywall-icons";
import { introOfferOf } from "./paywall-intro-offer";
import { PaywallPeriodPicker, type PlanId } from "./paywall-period-picker";
import { planDetail } from "./paywall-plan-detail";
import { PaywallPlansUnavailable } from "./paywall-plans-unavailable";
import {
	PAYWALL_SURFACE_FEATURE,
	PAYWALL_SURFACE_LINE,
} from "./paywall-surface-map";
import { ProgressiveBlurView } from "./progressive-blur-view";

// Display prices while offerings are unavailable (payments off, or RC still loading).
const FALLBACK = {
	annual: {
		detail: "$4.17/mo, billed yearly",
		numericPrice: 49.99,
		price: "$49.99/yr",
	},
	monthly: { detail: "billed monthly", numericPrice: 9.99, price: "$9.99/mo" },
} as const;

/** Why the paywall is closing; intake's `intake_completed` outcome hangs on it. */
export type PaywallExitReason = "purchased" | "dismissed";

type Props = {
	surface?: PaywallSurface;
	/** The companion's name for `{name}` in a surface line; passed by the route so purchases
	 * never imports talk. */
	companionName: string;
	/** Session to fulfil kindling for via `paths.requestKindling` (docs/paths-v1.md §12). */
	sessionId?: Id<"sessions">;
	/** Where a dismiss or purchase goes. Called at most once per mount; resolve `false` if
	 * swallowed to unlatch the guard. */
	onExit?: (reason: PaywallExitReason) => void | Promise<boolean>;
};

export function PaywallScreen({
	surface,
	sessionId,
	onExit,
	companionName,
}: Props) {
	const posthog = usePostHog();
	const defaultClose = usePaywall((s) => s.close);
	const closePaywall = onExit ?? (() => defaultClose());
	const insets = useSafeAreaInsets();
	const headerHeight = useHeaderHeight();
	const { offerings, purchase, isLoading, refreshOfferings } = useRevenueCat();
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
	const [ctaHeight, setCtaHeight] = useState(0);
	// Single-flight exit: a second `onExit` call would persist and track a second intake
	// outcome. The ref guards; two presses in one frame both read stale state.
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
	const highlightedFeature = surface ? PAYWALL_SURFACE_FEATURE[surface] : null;

	// Payments live but nothing to sell. Never show a purchasable-looking CTA here
	// (App Review 2.1 "unresponsive button").
	const plansUnavailable =
		appConfig.features.payments && !annualPkg && !monthlyPkg;

	// Retry a failed cold-start offerings fetch as soon as the paywall opens.
	useEffect(() => {
		if (!plansUnavailable || isLoading) {
			return;
		}
		refreshOfferings();
	}, [plansUnavailable, isLoading, refreshOfferings]);

	const handleRetry = () => {
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

	const priceOf = (pkg: PurchasesPackage | null, plan: PlanId) =>
		pkg
			? {
					detail: planDetail(plan, pkg.product),
					price: pkg.product.priceString,
				}
			: FALLBACK[plan];

	const numericPriceOf = (pkg: PurchasesPackage | null, plan: PlanId) =>
		pkg ? pkg.product.price : FALLBACK[plan].numericPrice;

	const annualNumeric = numericPriceOf(annualPkg, "annual");
	const monthlyNumeric = numericPriceOf(monthlyPkg, "monthly");
	const discountPercent =
		monthlyNumeric > 0
			? Math.round((1 - annualNumeric / (monthlyNumeric * 12)) * 100)
			: null;

	const selectedPkg = selected === "annual" ? annualPkg : monthlyPkg;

	const exit = (reason: PaywallExitReason) => {
		if (exiting.current) {
			return;
		}
		exiting.current = true;
		setIsExiting(true);
		Promise.resolve(closePaywall(reason)).then((written) => {
			// Only intake reports back, and only to say the write was swallowed. Unlatch,
			// or the close button is inert on a screen with no back edge.
			if (written !== false) {
				return;
			}
			exiting.current = false;
			setIsExiting(false);
		});
	};

	const handleContinue = () => {
		if (!selectedPkg) {
			return; // payments not live; the CTA is a visual placeholder
		}
		setBusy(true);
		purchase(selectedPkg, surface ?? undefined)
			.then((ok) => {
				if (!ok) {
					return;
				}
				// Best-effort: a failure here costs this one kindling, never the purchase.
				if (sessionId) {
					requestKindling({ sessionId }).catch(console.error);
				}
				exit("purchased"); // server entitlement query flips reactively
			})
			.finally(() => setBusy(false));
	};

	const selectedEligible =
		selected === "annual" ? annualIntroEligible : monthlyIntroEligible;
	const trialAvailable = hasFreeTrial(selectedPkg, selectedEligible);
	const ctaLabel = paywallCtaLabel(selected, selectedPkg, selectedEligible);

	return (
		<>
			<Stack.Toolbar placement="left">
				<Stack.Toolbar.View>
					<PaywallCloseButton
						isDisabled={isExiting}
						onClose={onExit && (() => exit("dismissed"))}
						sessionCount={summary?.sessionCount ?? null}
						surface={surface}
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
					contentContainerStyle={[
						styles.scrollContent,
						{
							paddingBottom: ctaHeight + 24,
							// Android's ScrollView has no contentInsetAdjustmentBehavior for a
							// transparent header.
							paddingTop: Platform.OS === "android" ? headerHeight + 16 : 0,
						},
					]}
					contentInsetAdjustmentBehavior="automatic"
				>
					<PaywallHero
						line={
							surface &&
							PAYWALL_SURFACE_LINE[surface]?.replace("{name}", companionName)
						}
					/>

					<PaywallFeatureSection title="What starts showing up">
						<PaywallFeatureItem
							description="The thing that keeps coming back, the third time instead of the thirtieth"
							icon={INSIGHTS_ICON}
							id="insights"
							isHighlighted={highlightedFeature === "insights"}
							title="Pattern & language insights"
						/>
						<PaywallFeatureItem
							description="Pick how it says things back and it stays that way"
							icon={MIRROR_TONE_ICON}
							id="mirror_tone"
							isHighlighted={highlightedFeature === "mirror_tone"}
							title="Mirror voice & tone"
						/>
						<PaywallFeatureItem
							description="Your own words, handed back and kept, in an archive that's yours"
							icon={QUOTES_ICON}
							id="quotes"
							isHighlighted={highlightedFeature === "quotes"}
							title="Personalized quotes"
						/>
						<PaywallFeatureItem
							description="Every guided track and song, unlocked"
							icon={AUDIO_ICON}
							id="audio"
							isHighlighted={highlightedFeature === "audio"}
							title="Full audio catalog"
						/>
					</PaywallFeatureSection>

					<PaywallFeatureSection title="Make it yours">
						<PaywallFeatureItem
							description="Five palettes - Noir, Emerald, Velvet, Rosé and Platinum"
							icon={THEMES_ICON}
							id="themes"
							isHighlighted={highlightedFeature === "themes"}
							title="Premium themes"
						/>
						<PaywallFeatureItem
							description="A face for the fire that isn't the default one"
							icon={AVATARS_ICON}
							id="avatars"
							isHighlighted={highlightedFeature === "avatars"}
							title="Custom avatars"
						/>
						<PaywallFeatureItem
							description="Every day, not just the recent ones"
							icon={TIMELINE_ICON}
							id="timeline"
							isHighlighted={highlightedFeature === "timeline"}
							title="Extended timeline"
						/>
						<PaywallFeatureItem
							description="More reflections, vents, and message drafts per day"
							icon={CAPS_ICON}
							id="caps"
							isHighlighted={highlightedFeature === "caps"}
							title="Higher daily limits"
						/>
					</PaywallFeatureSection>
				</ScrollView>

				<ProgressiveBlurView height={insets.top + 60} position="top" />
				<ProgressiveBlurView height={ctaHeight + 100} position="bottom" />

				<View
					className="absolute right-0 bottom-0 left-0 gap-4 px-5"
					onLayout={(e) => setCtaHeight(e.nativeEvent.layout.height)}
					style={{ paddingBottom: insets.bottom + 12 }}
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
								discountPercent={discountPercent}
								hasFreeTrial={trialAvailable}
								monthly={priceOf(monthlyPkg, "monthly")}
								monthlyIntro={monthlyIntro}
								onSelect={setSelected}
								selected={selected}
							/>
							<PaywallCta
								isBusy={busy}
								isDisabled={
									busy ||
									isPlus ||
									(appConfig.features.payments && !selectedPkg)
								}
								label={ctaLabel}
								onPress={handleContinue}
							/>
						</>
					)}
				</View>
			</View>
		</>
	);
}

const styles = StyleSheet.create({
	scrollContent: { gap: 32, paddingHorizontal: 20 },
});
