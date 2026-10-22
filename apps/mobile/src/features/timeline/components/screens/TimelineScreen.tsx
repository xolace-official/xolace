import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useObserve } from "expo-observe";
import { LegendList } from "@legendapp/list/react-native";
import { TimelineEntryCard } from "@/src/features/timeline/components/timeline-entry-card";
import { TimelineSectionHeader } from "@/src/features/timeline/components/timeline-section-header";
import { TimelineUpgradeBanner } from "@/src/features/timeline/components/timeline-upgrade-banner";
import { AppText } from "@/src/components/shared/app-text";
import { useTimeline } from "@/src/features/timeline/hooks/use-timeline";
import type { TimelineFlatItem } from "@/src/features/timeline/types";
import { FullMorphLoader as ActiveLoader } from "@/src/components/shared/loader/morph/full-morph-loader";

const renderItem = ({
  item,
  index,
}: {
  item: TimelineFlatItem;
  index: number;
}) => {
  if (item.type === "section") {
    return <TimelineSectionHeader label={item.label} isFirst={index === 0} />;
  }
  return <TimelineEntryCard entry={item.entry} />;
};

const keyExtractor = (item: TimelineFlatItem) => item.id;

const styles = StyleSheet.create({
  listContent: { paddingBottom: 40 },
  listContentWithNudge: { paddingBottom: 100 },
  footerLoader: { paddingVertical: 20 },
});

const EmptyState = () => (
  <View className="flex-1 items-center justify-center px-10">
    <AppText className="text-center text-base leading-7 text-foreground/30">
      Your reflections will appear here{"\n"} after your first session.
    </AppText>
  </View>
);

const LoadingFooter = () => <ActivityIndicator style={styles.footerLoader} />;

export const TimelineScreen = () => {
  const {
    sections,
    isLoading,
    canLoadMore,
    isLoadingMore,
    loadMore,
    showUpgradeNudge,
    windowDays,
  } = useTimeline();
  const { markInteractive } = useObserve();

  // Per-route TTI for /timeline: ready once the first page resolves, not at
  // mount. Hook stays above the early return to satisfy rules-of-hooks; the
  // metric is recorded only on the first call per navigation.
  useEffect(() => {
    if (!isLoading) markInteractive();
  }, [isLoading, markInteractive]);

  if (isLoading) {
    return <ActiveLoader />;
  }

  // Narrows windowDays to a number for the banner. Free users always get a
  // number back with hasOlderSessions; the null check is the type proof.
  const showNudge = showUpgradeNudge && windowDays !== null;

  return (
    <View className="flex-1">
      <LegendList
        data={sections}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={100}
        recycleItems
        getItemType={(item) => item.type}
        onEndReached={canLoadMore ? loadMore : undefined}
        onEndReachedThreshold={0.4}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          showNudge ? styles.listContentWithNudge : styles.listContent
        }
        ListEmptyComponent={EmptyState}
        ListFooterComponent={isLoadingMore ? LoadingFooter : undefined}
      />
      {showNudge && <TimelineUpgradeBanner windowDays={windowDays} />}
    </View>
  );
};
