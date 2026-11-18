import { useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { defaultPlan, type PlanId } from "@/features/purchases/plans";
import { CompoundingCard } from "./compare/compounding-card";
import { type Side, SideSwitch } from "./compare/side-switch";
import { PlusFooter } from "./footer/plus-footer";
import { PlusArt } from "./hero/plus-art";
import { PlusHeader } from "./hero/plus-header";
import { PlusIncludes } from "./includes/plus-includes";
import { usePlusScreen } from "./plus-data";
import { footerFlows } from "./plus-model";

/** Xolace+, honestly: the same rough week, two ways it goes, and everything Plus adds. Saying
 * it stays free. The middle scrolls; the plans and the button stay put, except at the
 * accessibility text sizes, where they scroll with the page. */
export function PlusScreen({
	side: startSide = "plus",
	plan: startPlan,
}: {
	/** The side it opens on; With Plus unless a dev state holds Free. */
	side?: Side;
	/** A plan held picked (dev states); otherwise the default until they pick. */
	plan?: PlanId;
}) {
	const { state } = usePlusScreen();
	const insets = useSafeAreaInsets();
	const flows = footerFlows(useWindowDimensions().fontScale);
	const [side, setSide] = useState<Side>(startSide);
	const [picked, setPicked] = useState<PlanId | null>(startPlan ?? null);
	// Yearly unless the store sells only monthly, until they pick.
	const plan =
		picked && state.plans[picked].pkg ? picked : defaultPlan(state.plans);
	return (
		<View className="flex-1 bg-background">
			<PlusArt plus={side === "plus"} />
			<ScrollView
				contentContainerStyle={{ paddingTop: insets.top + 4 }}
				showsVerticalScrollIndicator={false}
			>
				<View className="gap-3.5 px-5 pb-6">
					<PlusHeader />
					<SideSwitch onSide={setSide} side={side} />
					<CompoundingCard plus={side === "plus"} />
					<View className="mt-3">
						<PlusIncludes />
					</View>
				</View>
				{flows && <PlusFooter onPick={setPicked} plan={plan} stacked />}
			</ScrollView>
			{!flows && <PlusFooter onPick={setPicked} plan={plan} />}
		</View>
	);
}
