import { Stack } from "expo-router";
import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { useHeaderOptions } from "@/lib/header-options";
import { AgeGateSheet } from "../age-gate/age-gate-sheet";
import { PROFILE } from "./copy";
import { ProfileFacts } from "./facts";
import { ProfileAura, ProfileHero } from "./hero";
import { XolacerPrimerSheet } from "./primer-sheet";
import { ProfileCta } from "./profile-cta";
import { XolacerBlockDialog, XolacerToolbar } from "./xolacer-chrome";
import { useXolacerScreen } from "./xolacer-data";

/** A Xolacer: the facts in front of you before you ask, including what they'll see of you. The
 * page scrolls under the header; the call to action stays at the bottom. */
export function XolacerScreen() {
	const { state, actions, ageGate } = useXolacerScreen();
	// See-through on iOS, so the glow runs under it; opaque on Android.
	const header = (
		<Stack.Screen options={{ ...useHeaderOptions("small"), title: "" }} />
	);

	if (state.phase === "loading") {
		return (
			<>
				{header}
				<ProfileSkeleton />
			</>
		);
	}
	if (state.phase === "gone") {
		return (
			<View className="flex-1 items-center justify-center gap-2 bg-background px-10">
				{header}
				<AppText center variant="headline">
					{PROFILE.gone.title}
				</AppText>
				<AppText center color="muted" variant="callout">
					{PROFILE.gone.body}
				</AppText>
			</View>
		);
	}

	return (
		<View className="flex-1 overflow-hidden bg-background">
			{header}
			<ProfileAura />
			<XolacerToolbar />
			<ScrollView
				contentContainerClassName="gap-5 px-4 pb-4"
				contentInsetAdjustmentBehavior="automatic"
			>
				<ProfileHero />
				<ProfileFacts />
			</ScrollView>
			<View className="px-4 pt-2">
				<ProfileCta />
			</View>
			<XolacerPrimerSheet
				isConfirming={state.sending}
				isOpen={state.primer !== null}
				onClose={actions.closePrimer}
				onConfirm={state.primer === "gate" ? actions.confirmPrimer : undefined}
			/>
			<XolacerBlockDialog />
			<AgeGateSheet gate={ageGate} />
		</View>
	);
}

function ProfileSkeleton() {
	return (
		<View
			accessibilityElementsHidden
			className="flex-1 items-center gap-4 bg-background px-6 pt-28"
			importantForAccessibility="no-hide-descendants"
		>
			<View className="size-29 rounded-full bg-surface-secondary" />
			<View className="h-7 w-36 rounded-full bg-surface-secondary" />
			<View className="h-4 w-52 rounded-full bg-surface-secondary" />
			<View className="mt-3 h-28 w-full rounded-[22px] bg-surface-secondary" />
		</View>
	);
}
