import { useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { usePaginatedQuery } from "convex/react";
import { PressableFeedback } from "heroui-native";
import { api } from "@/convex/_generated/api";
import { AppText } from "@/src/components/shared/app-text";
import { playSoftPress } from "@/src/lib/haptics";
import { toTimelineEntry } from "@/src/features/timeline/utils";
import { StackedCarousel } from "./stacked-carousel";
import { DiscoveryMomentCard } from "./discovery-moment-card";
import { MomentsSkeleton } from "./skeletons";
import type { TimelineEntry } from "@/src/features/timeline/types";

const MOMENT_COUNT = 4;
const CARD_HEIGHT = 166;
// Matches the horizontal px-4 the rest of the screen (e.g. DailyQuotesCard)
// uses, so the centered card's edges line up with everything above it.
const SCREEN_PADDING_X = 32;

/**
 * Teaser for the full timeline — reuses `listForTimeline` capped to the first
 * page (never calls loadMore), so it inherits the same free-tier window gate
 * as the real timeline rather than duplicating that logic in a second query.
 */
export function DiscoveryTimelineSection() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = width - SCREEN_PADDING_X;
  const { results, status } = usePaginatedQuery(
    api.sessions.listForTimeline,
    {},
    { initialNumItems: MOMENT_COUNT },
  );

  if (status === "LoadingFirstPage") return <MomentsSkeleton cardHeight={CARD_HEIGHT} />;
  if (results.length === 0) return null;

  const entries: TimelineEntry[] = results.map(toTimelineEntry);

  const goToTimeline = () => {
    playSoftPress();
    router.push("/(protected)/timeline");
  };

  const goToSession = (entry: TimelineEntry) => {
    playSoftPress();
    router.push({
      pathname: "/(protected)/timeline/session/[id]",
      params: { id: entry.id },
    });
  };

  return (
    <View className="mt-10">
      <View className="flex-row items-start justify-between px-4">
        <View className="flex-1 pr-3">
          <AppText className="text-lg font-semibold text-foreground">
            Your Moments
          </AppText>
          <AppText className="mt-1.5 text-sm leading-5 text-muted">
            A few reflections you&rsquo;ve carried recently.
          </AppText>
        </View>
        <PressableFeedback
          onPress={goToTimeline}
          accessibilityRole="button"
          accessibilityLabel="See more moments"
        >
          <AppText className="text-sm font-medium text-accent">
            See more
          </AppText>
        </PressableFeedback>
      </View>

      <View className="mt-4">
        <StackedCarousel
          data={entries}
          renderCard={(entry) => <DiscoveryMomentCard entry={entry} />}
          onCardPress={goToSession}
          cardWidth={cardWidth}
          cardHeight={CARD_HEIGHT}
        />
      </View>
    </View>
  );
}
