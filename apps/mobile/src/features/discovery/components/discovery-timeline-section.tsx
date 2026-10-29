import { api } from "@xolace/backend/convex/_generated/api";
import { usePaginatedQuery } from "convex/react";
import { useRouter } from "expo-router";
import { PressableFeedback } from "heroui-native";
import { useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import type { TimelineEntry } from "@/features/timeline/types";
import { toTimelineEntry } from "@/features/timeline/utils";
import { playSoftPress } from "@/lib/haptics";
import { DiscoveryMomentCard } from "./discovery-moment-card";
import { MomentsSkeleton } from "./skeletons";
import { StackedCarousel } from "./stacked-carousel";

const MOMENT_COUNT = 4;
const CARD_HEIGHT = 166;
// Matches the screen's px-4 so the centered card's edges line up.
const SCREEN_PADDING_X = 32;

/** Timeline teaser: `listForTimeline`'s first page only, so it inherits the free-tier window
 * gate. */
export function DiscoveryTimelineSection() {
	const router = useRouter();
	const { width } = useWindowDimensions();
	const cardWidth = width - SCREEN_PADDING_X;
	const { results, status } = usePaginatedQuery(
		api.sessions.listForTimeline,
		{},
		{ initialNumItems: MOMENT_COUNT }
	);

	if (status === "LoadingFirstPage") {
		return <MomentsSkeleton cardHeight={CARD_HEIGHT} />;
	}
	if (results.length === 0) {
		return null;
	}

	const entries: TimelineEntry[] = results.map(toTimelineEntry);

	const goToTimeline = () => {
		playSoftPress();
		router.push("/(protected)/timeline");
	};

	const goToSession = (entry: TimelineEntry) => {
		playSoftPress();
		router.push({
			params: { id: entry.id },
			pathname: "/(protected)/timeline/session/[id]",
		});
	};

	return (
		<View className="mt-10">
			<View className="flex-row items-start justify-between px-4">
				<View className="flex-1 pr-3">
					<AppText className="font-semibold text-foreground text-lg">
						Your Moments
					</AppText>
					<AppText className="mt-1.5 text-muted text-sm leading-5">
						A few reflections you&rsquo;ve carried recently.
					</AppText>
				</View>
				<PressableFeedback
					accessibilityLabel="See more moments"
					accessibilityRole="button"
					onPress={goToTimeline}
				>
					<AppText className="font-medium text-accent text-sm">
						See more
					</AppText>
				</PressableFeedback>
			</View>

			<View className="mt-4">
				<StackedCarousel
					cardHeight={CARD_HEIGHT}
					cardWidth={cardWidth}
					data={entries}
					onCardPress={goToSession}
					renderCard={(entry) => <DiscoveryMomentCard entry={entry} />}
				/>
			</View>
		</View>
	);
}
