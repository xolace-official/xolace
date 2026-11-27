import { Stack } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PLAN_CTA } from "@/features/purchases/plans";
import { PAYWALL } from "./copy";
import { PaywallCta } from "./paywall-cta";
import { usePaywallData } from "./paywall-data";
import { PaywallFeatureItem } from "./paywall-feature-item";
import { PaywallFeatureSection } from "./paywall-feature-section";
import {
	PaywallCloseButton,
	PaywallRestoreButton,
} from "./paywall-header-actions";
import { PaywallHero } from "./paywall-hero";
import { FEATURE_ICON } from "./paywall-icons";
import { PaywallPeriodPicker } from "./paywall-period-picker";
import { PaywallPlansUnavailable } from "./paywall-plans-unavailable";
import { ProgressiveBlurView } from "./progressive-blur-view";

/** The /upgrade paywall. Reads `PaywallData`, which the route wraps it in. */
export function PaywallScreen() {
	const { actions, state } = usePaywallData();
	const insets = useSafeAreaInsets();
	const headerHeight = useHeaderHeight();
	const [ctaHeight, setCtaHeight] = useState(0);

	return (
		<>
			<Stack.Toolbar placement="left">
				<Stack.Toolbar.View>
					<PaywallCloseButton
						isDisabled={state.isExiting}
						onClose={actions.dismiss}
					/>
				</Stack.Toolbar.View>
			</Stack.Toolbar>
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.View>
					<PaywallRestoreButton onRestore={actions.restore} />
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
					<PaywallHero line={state.line} />

					{PAYWALL.sections.map((section) => (
						<PaywallFeatureSection key={section.title} title={section.title}>
							{section.features.map((feature) => (
								<PaywallFeatureItem
									description={feature.description}
									icon={FEATURE_ICON[feature.id]}
									id={feature.id}
									isHighlighted={state.highlighted === feature.id}
									key={feature.id}
									title={feature.title}
								/>
							))}
						</PaywallFeatureSection>
					))}
				</ScrollView>

				<ProgressiveBlurView height={insets.top + 60} position="top" />
				<ProgressiveBlurView height={ctaHeight + 100} position="bottom" />

				<View
					className="absolute right-0 bottom-0 left-0 gap-4 px-5"
					onLayout={(e) => setCtaHeight(e.nativeEvent.layout.height)}
					style={{ paddingBottom: insets.bottom + 12 }}
				>
					{state.plansUnavailable ? (
						<PaywallPlansUnavailable
							isRetrying={state.retrying}
							onRetry={actions.retry}
						/>
					) : (
						<>
							<PaywallPeriodPicker
								annual={state.annual}
								hasFreeTrial={state.trialAvailable}
								monthly={state.monthly}
								monthlyIntro={state.monthlyIntro}
								onSelect={actions.select}
								selected={state.selected}
							/>
							<PaywallCta
								isBusy={state.busy}
								isDisabled={state.buyDisabled}
								label={PLAN_CTA}
								onPress={actions.buy}
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
