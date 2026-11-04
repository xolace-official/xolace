import { INTAKE_V2_VERSION } from "@xolace/backend/convex/lib/validators";
import { ScrollView, View } from "react-native";
import {
	MINI_PLAYER_CLEARANCE,
	useMiniPlayerShown,
} from "@/features/browse/now-playing/now-playing-store";
import { CampfireCard } from "@/features/discovery/components/campfire-card";
import { CohortCard } from "@/features/discovery/components/cohort-card";
import { DailyQuotesCard } from "@/features/discovery/components/daily-quotes-card";
import { DiscoveryHeader } from "@/features/discovery/components/discovery-header";
import { DiscoveryTimelineSection } from "@/features/discovery/components/discovery-timeline-section";
import { KindlingTodayCard } from "@/features/discovery/components/kindling-today-card";
import { LibraryStrip } from "@/features/discovery/components/library-strip";
import {
	DOCK_CLEARANCE,
	ReflectDock,
} from "@/features/discovery/components/reflect-dock";
import { useFullContext } from "@/lib/convex/use-full-context";

/** First tab. The masthead runs under the status bar, so this screen pads the safe area itself. */
export function DiscoveryScreen() {
	const lift = useMiniPlayerShown() ? MINI_PLAYER_CLEARANCE : 0;
	// v2 cut the intake's campfire count; it stands in the cohort slot until there's a
	// weekly number of their own (#712). Control keeps today's Discovery.
	const v2Intake =
		useFullContext()?.intake?.intakeVersion === INTAKE_V2_VERSION;
	return (
		<View className="flex-1 bg-background">
			<ScrollView
				alwaysBounceVertical={false}
				className="flex-1"
				contentContainerStyle={{ paddingBottom: DOCK_CLEARANCE + lift + 30 }}
				contentInsetAdjustmentBehavior="never"
			>
				<DiscoveryHeader />

				{/* Wide gap: Flux's feet and glow overhang the cohort card's box. */}
				<View className="gap-10 px-4 pt-10">
					<CohortCard fallback={v2Intake ? <CampfireCard /> : null} />
					<KindlingTodayCard />
					<DailyQuotesCard />
				</View>

				<LibraryStrip />
				<DiscoveryTimelineSection />
			</ScrollView>

			<ReflectDock />
		</View>
	);
}
