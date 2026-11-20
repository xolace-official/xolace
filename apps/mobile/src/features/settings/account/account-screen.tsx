import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { LogOutSection } from "@/features/settings/account/log-out/log-out-section";
import { NamesSection } from "@/features/settings/account/names/names-section";
import { PlusSection } from "@/features/settings/account/plus/plus-section";
import { SignInCard } from "@/features/settings/account/sign-in/sign-in-card";

export function AccountScreen({ devTools }: { devTools?: ReactNode }) {
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
