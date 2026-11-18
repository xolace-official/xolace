import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { LogOutSection } from "@/features/settings/account/log-out/log-out-section";
import { NamesSection } from "@/features/settings/account/names/names-section";
import { PlusSection } from "@/features/settings/account/plus/plus-section";
import { SignInCard } from "@/features/settings/account/sign-in/sign-in-card";

/**
 * Settings › Account (board "Account v2", P/design/handoff/settings-sections.md): how you signed
 * in, the two names, Xolace+, and Log out on its own. Deleting the account lives in Privacy &
 * Data. Nothing animates in.
 */
export function AccountScreen({
	devTools,
}: {
	/** Dev builds: production's Dev tools section, which brings its own title. The route passes
	 * it in, so this screen never imports dev code. */
	devTools?: ReactNode;
}) {
	return (
		<ScrollView
			className="bg-background"
			contentContainerClassName="pt-1 pb-10"
			contentInsetAdjustmentBehavior="automatic"
		>
			<SignInCard />
			<NamesSection />
			<PlusSection />
			<LogOutSection />
			{devTools ? <View className="mt-7">{devTools}</View> : null}
		</ScrollView>
	);
}
