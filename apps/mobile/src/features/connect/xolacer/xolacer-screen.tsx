import { Stack } from "expo-router";
import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { ProfileSkeleton } from "@/components/shared/skeleton-shapes";
import { useHeaderOptions } from "@/lib/header-options";
import { PROFILE } from "./copy";
import { ProfileFacts } from "./facts";
import { ProfileAura, ProfileHero } from "./hero";
import { XolacerPrimerSheet } from "./primer-sheet";
import { ProfileCta } from "./profile-cta";
import { XolacerBlockDialog, XolacerToolbar } from "./xolacer-chrome";
import { useXolacerScreen } from "./xolacer-data";

export function XolacerScreen() {
	const { state, actions } = useXolacerScreen();
	const header = (
		<Stack.Screen options={{ ...useHeaderOptions("small"), title: "" }} />
	);

	if (state.phase === "loading") {
		return (
			<>
				{header}
				<View className="flex-1 bg-background pt-safe-offset-14 pb-safe-or-4">
					<ProfileSkeleton label={PROFILE.loading} />
				</View>
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
		</View>
	);
}
