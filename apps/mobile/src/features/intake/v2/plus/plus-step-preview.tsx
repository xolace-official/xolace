// Dev only: the Xolace+ step (#713) as intake shows it, on sample plans, so its UI can be
// checked on a simulator. Nothing here reaches the store or analytics.
import { router } from "expo-router";
import { useToast } from "heroui-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { IntakeScreen } from "@/features/intake/questionnaire/intake-screen";
import type { PlusSide } from "@/features/intake/v2/machine";
import { defaultPlan } from "@/features/intake/v2/plus/plans";
import { PlusStepView } from "@/features/intake/v2/plus/plus-step-view";
import { SAMPLE_SCENARIOS } from "@/features/intake/v2/plus/sample-plans";
import type { PlanId } from "@/features/purchases/screens/paywall-period-picker";

export function PlusStepPreview() {
	const { toast } = useToast();
	const [scenario, setScenario] = useState(0);
	const [side, setSide] = useState<PlusSide>("free");
	const [picked, setPicked] = useState<PlanId | null>(null);
	const { label, plans } = SAMPLE_SCENARIOS[scenario];
	const close = () =>
		router.canGoBack() ? router.back() : router.replace("/(protected)");

	return (
		<IntakeScreen>
			<View className="flex-row items-center justify-between gap-3 px-5 pt-2">
				<Pressable
					accessibilityHint="Shows the next set of sample plans"
					accessibilityRole="button"
					className="flex-1"
					onPress={() => {
						setScenario((scenario + 1) % SAMPLE_SCENARIOS.length);
						setPicked(null);
					}}
				>
					<AppText className="text-[12px] text-muted" numberOfLines={1}>
						Preview · sample prices · {label} ↻
					</AppText>
				</Pressable>
				<Pressable accessibilityRole="button" hitSlop={12} onPress={close}>
					<AppText className="font-[Poppins-Medium] text-[12px] text-foreground">
						Close
					</AppText>
				</Pressable>
			</View>
			<PlusStepView
				busy={false}
				buying={false}
				onBuy={() =>
					toast.show({
						description: "Sample plans: nothing was bought.",
						label: "Preview",
					})
				}
				onContinueFree={close}
				onPick={setPicked}
				onRetry={() => undefined}
				onSide={setSide}
				// The demo talks to the backend; here "Try it" only shows how it looks in intake.
				onTryTalk={() =>
					toast.show({
						description: "Opens the Talk demo in intake.",
						label: "Preview",
					})
				}
				owned={false}
				plan={picked ?? defaultPlan(plans)}
				plans={plans}
				retrying={false}
				side={side}
				unavailable={false}
			/>
		</IntakeScreen>
	);
}
