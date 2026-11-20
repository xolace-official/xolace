import { LegendList } from "@legendapp/list/react-native";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { COPY } from "@/features/explore/copy";
import { listMeta } from "@/features/explore/explore-model";
import { EXS } from "@/features/explore/explore-style";
import { useFamilyListScreen } from "@/features/explore/list/family-list-data";
import { FamilyMenu } from "@/features/explore/list/family-menu";
import { RowsSkeleton } from "@/features/explore/rows/rows-skeleton";
import { TrackRow } from "@/features/explore/rows/track-row";
import { useHeaderOptions } from "@/lib/header-options";
import { useMiniPlayerInset } from "@/lib/now-playing/now-playing-store";

const ROW_ESTIMATE = 68;
const LOAD_AHEAD = 0.4;

export function FamilyListScreen() {
	const { state, actions } = useFamilyListScreen();
	const header = useHeaderOptions("small");
	const playerInset = useMiniPlayerInset();
	const pick = (f: typeof state.family) => {
		if (f !== state.family) {
			actions.pick(f);
		}
	};

	return (
		<>
			<Stack.Screen options={{ ...header, title: COPY.family[state.family] }} />
			<FamilyMenu onChange={pick} value={state.family} />
			<LegendList
				className="bg-background"
				contentContainerStyle={{ paddingBottom: EXS.bottom + playerInset }}
				contentInsetAdjustmentBehavior="automatic"
				data={state.tracks ?? []}
				estimatedItemSize={ROW_ESTIMATE}
				key={state.family}
				keyExtractor={(t) => t._id}
				ListEmptyComponent={
					state.tracks === undefined ? (
						<RowsSkeleton />
					) : (
						<View className="px-8 pt-18">
							<AppText center color="muted" variant="callout">
								{COPY.empty}
							</AppText>
						</View>
					)
				}
				ListFooterComponent={
					state.loadingMore ? <ActivityIndicator className="py-6" /> : null
				}
				onEndReached={actions.loadMore}
				onEndReachedThreshold={LOAD_AHEAD}
				recycleItems
				renderItem={({ item, index }) => (
					<TrackRow
						listen={state.listen}
						meta={listMeta(item)}
						rule={index > 0}
						track={item}
					/>
				)}
			/>
		</>
	);
}
