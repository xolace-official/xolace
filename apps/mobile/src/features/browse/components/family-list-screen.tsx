import { LegendList } from "@legendapp/list/react-native";
import { api } from "@xolace/backend/convex/_generated/api";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Skeleton } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import { useMiniPlayerInset } from "@/src/features/browse/now-playing/now-playing-store";
import { useStablePaginatedQuery } from "@/src/lib/convex/use-stable-query";
import { useAppStore } from "@/src/store/store";
import { BrowseFilterMenu, type FilterOption } from "./browse-filter-menu";
import { FAMILY_LABEL, type TrackItem, TrackRow } from "./track-row";

type Family = keyof typeof FAMILY_LABEL;
const PAGE_SIZE = 30;
const FAMILY_OPTIONS: FilterOption<Family>[] = [
	{ icon: "waveform", label: FAMILY_LABEL.support, value: "support" },
	{ icon: "music.note", label: FAMILY_LABEL.music, value: "music" },
];

const renderItem = ({ item }: { item: TrackItem }) => (
	<TrackRow from="family-list" track={item} />
);
const keyExtractor = (item: TrackItem) => item._id;

function Empty() {
	return (
		<View className="items-center px-8 pt-24">
			<AppText className="text-center text-[15px] text-muted">
				Nothing here yet.
			</AppText>
		</View>
	);
}

/**
 * Per-family list (`list?family=…`, §9.3). The family is swappable from the
 * header toolbar menu; the stable paginated wrapper keeps the previous page
 * on screen while the new family's first page loads, so the swap happens in
 * place instead of blanking the list.
 */
export function FamilyListScreen() {
	// Clears the floating mini-player off the last row (none on iOS 26).
	const playerInset = useMiniPlayerInset();
	const params = useLocalSearchParams<{ family?: Family }>();
	const [family, setFamily] = useState<Family>(
		params.family === "music" ? "music" : "support"
	);
	const posthog = usePostHog();
	const musicIntroSeen = useAppStore((s) => s.musicIntroSeen);
	const supportAudioIntroSeen = useAppStore((s) => s.supportAudioIntroSeen);

	useEffect(() => {
		posthog.capture("browse_family_opened", { family });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [family]);

	// Keyed on the live family, not route mount: toggling the toolbar to a
	// family whose welcome hasn't been seen opens it, even mid-session. Music
	// and Support audio are independently keyed. The modal sets its own flag.
	useEffect(() => {
		const introSeen =
			family === "music" ? musicIntroSeen : supportAudioIntroSeen;
		if (!introSeen) {
			router.push({ params: { family }, pathname: "/browse-intro" });
		}
	}, [family, musicIntroSeen, supportAudioIntroSeen]);

	const { results, status, isLoading, loadMore } = useStablePaginatedQuery(
		api.browse.listByFamily,
		{ family },
		{ initialNumItems: PAGE_SIZE }
	);

	return (
		<>
			<Stack.Screen options={{ title: FAMILY_LABEL[family] }} />
			<BrowseFilterMenu
				onChange={setFamily}
				options={FAMILY_OPTIONS}
				title="Family"
				value={family}
			/>

			{status === "LoadingFirstPage" ? (
				<ScrollView
					className="flex-1"
					contentContainerStyle={{ paddingTop: 8 }}
					contentInsetAdjustmentBehavior="automatic"
				>
					<View className="gap-3 px-4">
						<Skeleton className="h-[68px] rounded-none" />
						<Skeleton className="h-[68px] rounded-none" />
						<Skeleton className="h-[68px] rounded-none" />
					</View>
				</ScrollView>
			) : (
				<LegendList
					contentContainerStyle={{ paddingBottom: 40 + playerInset }}
					contentInsetAdjustmentBehavior="automatic"
					data={results}
					estimatedItemSize={68}
					keyExtractor={keyExtractor}
					ListEmptyComponent={Empty}
					ListFooterComponent={
						isLoading && results.length > 0 ? (
							<ActivityIndicator className="py-4" />
						) : null
					}
					onEndReached={
						status === "CanLoadMore" ? () => loadMore(PAGE_SIZE) : undefined
					}
					onEndReachedThreshold={0.4}
					recycleItems
					renderItem={renderItem}
				/>
			)}
		</>
	);
}
