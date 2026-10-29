import { LegendList } from "@legendapp/list/react-native";
import { useObserve } from "expo-observe";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { FullMorphLoader as ActiveLoader } from "@/components/shared/loader/morph/full-morph-loader";
import { TimelineEntryCard } from "@/features/timeline/components/timeline-entry-card";
import { TimelineSectionHeader } from "@/features/timeline/components/timeline-section-header";
import { TimelineUpgradeBanner } from "@/features/timeline/components/timeline-upgrade-banner";
import { useTimeline } from "@/features/timeline/hooks/use-timeline";
import type { TimelineFlatItem } from "@/features/timeline/types";

const renderItem = ({
	item,
	index,
}: {
	item: TimelineFlatItem;
	index: number;
}) => {
	if (item.type === "section") {
		return <TimelineSectionHeader isFirst={index === 0} label={item.label} />;
	}
	return <TimelineEntryCard entry={item.entry} />;
};

const keyExtractor = (item: TimelineFlatItem) => item.id;

const styles = StyleSheet.create({
	footerLoader: { paddingVertical: 20 },
	listContent: { paddingBottom: 40 },
	listContentWithNudge: { paddingBottom: 100 },
});

const EmptyState = () => (
	<View className="flex-1 items-center justify-center px-10">
		<AppText className="text-center text-base text-foreground/30 leading-7">
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
	// mount. Recorded only on the first call per navigation.
	useEffect(() => {
		if (!isLoading) {
			markInteractive();
		}
	}, [isLoading, markInteractive]);

	if (isLoading) {
		return <ActiveLoader />;
	}

	// Free users always get a number with hasOlderSessions; the null check narrows the type.
	const showNudge = showUpgradeNudge && windowDays !== null;

	return (
		<View className="flex-1">
			<LegendList
				contentContainerStyle={
					showNudge ? styles.listContentWithNudge : styles.listContent
				}
				contentInsetAdjustmentBehavior="automatic"
				data={sections}
				estimatedItemSize={100}
				getItemType={(item) => item.type}
				keyExtractor={keyExtractor}
				ListEmptyComponent={EmptyState}
				ListFooterComponent={isLoadingMore ? LoadingFooter : undefined}
				onEndReached={canLoadMore ? loadMore : undefined}
				onEndReachedThreshold={0.4}
				recycleItems
				renderItem={renderItem}
				showsVerticalScrollIndicator={false}
			/>
			{showNudge && <TimelineUpgradeBanner windowDays={windowDays} />}
		</View>
	);
};
