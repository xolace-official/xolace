// The insights screen: variant F, "Glass ticks" (#491). The free view (#517),
// filled in with numbers, "your usual" and the 7-day trend for Xolace+ (#518).

import { api } from "@xolace/backend/convex/_generated/api";
import { Stack } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/src/components/shared/app-text";
import { TopBlur } from "@/src/components/shared/top-blur";
import { UpsellScrollContext } from "@/src/features/insights/compounding-upsell";
import { CAVEAT, type InsightsView } from "@/src/features/insights/domains";
import { InsightsSkeleton } from "@/src/features/insights/insights-skeleton";
import { OverallDial } from "@/src/features/insights/overall-dial";
import { PartsOfLife } from "@/src/features/insights/parts-of-life";
import { useHour } from "@/src/features/insights/use-hour";
import { AuroraArc } from "@/src/features/profile/components/aurora-arc";
import { usePlusEntitlement } from "@/src/features/purchases/use-plus-entitlement";
import { useStableQuery } from "@/src/lib/convex/use-stable-query";

export function InsightsScreen() {
	const insets = useSafeAreaInsets();
	const { isPlus } = usePlusEntitlement();
	// Stable: `now` ticks hourly; hold the last result across the re-subscribe.
	const now = useHour();
	// plusView is null until the server sees the entitlement (webhook lag) and
	// again after a lapse; the free view covers both.
	const held = useStableQuery(
		api.compounding.insights.plusView,
		isPlus ? { now } : "skip"
	);
	// A skip would keep the held Plus view; a lapse must drop it.
	const plus = isPlus ? held : undefined;
	// Stable: on a lapse the free view re-subscribes; hold its last result, don't blank.
	const free = useStableQuery(
		api.compounding.insights.freeView,
		plus ? "skip" : { now }
	);
	const view: InsightsView | undefined = plus ?? free;
	// The upsell line below the dial spends itself only once scrolled into view.
	const [scrollListeners] = useState(() => new Set<() => void>());

	return (
		<View className="flex-1 bg-background">
			{/* Something behind the glass, so it doesn't read flat (#491 port notes). */}
			<AuroraArc height={insets.top + 280} />
			<Stack.Screen
				options={{
					headerBackButtonDisplayMode: "minimal",
					headerShown: true,
					headerTitle: "Steadiness",
					headerTransparent: true,
				}}
			/>
			<UpsellScrollContext value={scrollListeners}>
				<ScrollView
					contentContainerStyle={{
						paddingBottom: insets.bottom + 40,
						paddingTop: insets.top + 64,
					}}
					onScroll={() => scrollListeners.forEach((f) => f())}
					scrollEventThrottle={100}
				>
					{view ? (
						<View className="gap-8 px-5">
							<OverallDial
								insights={view.insights}
								locked={!isPlus}
								overall={view.overall}
								trend={view.overallTrend}
								trendSince={view.overallTrendSince}
							/>
							{view.domains.length > 0 && (
								<PartsOfLife
									domains={view.domains}
									insights={view.insights}
									isPlus={isPlus}
									upsell={view.upsell}
								/>
							)}
							<AppText className="px-4 text-center text-[12px] text-muted leading-5">
								{CAVEAT}
							</AppText>
						</View>
					) : (
						<InsightsSkeleton />
					)}
				</ScrollView>
			</UpsellScrollContext>
			<TopBlur height={insets.top + 70} />
		</View>
	);
}
