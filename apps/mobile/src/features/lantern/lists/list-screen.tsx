import { LegendList } from "@legendapp/list/react-native";
import { Stack } from "expo-router";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { LS } from "@/features/lantern/lantern-style";
import { EntryRow } from "@/features/lantern/lists/entry-row";
import { useList } from "@/features/lantern/lists/list-data";
import { RowsSkeleton } from "@/features/lantern/lists/rows-skeleton";
import { useHeaderOptions } from "@/lib/header-options";

/** A row before it's measured: 12 + 78 + 12, or a little more when the meta wraps. */
const ROW_ESTIMATE = 106;
const LOAD_AHEAD = 0.5;

/**
 * A kind, a subject or Saved (handoff §3.2, §3.4): a small title and production's rows, recycled
 * (`LegendList`), or a quiet line when there's nothing. The list is the screen's first
 * descendant, so the native bar folds over it.
 */
export function ListScreen() {
	const { state, actions } = useList();
	const header = useHeaderOptions("small");
	return (
		<>
			<Stack.Screen options={{ ...header, title: state.title }} />
			<LegendList
				className="bg-background"
				contentContainerStyle={{ paddingBottom: LS.bottom, paddingTop: 4 }}
				contentInsetAdjustmentBehavior="automatic"
				data={state.items ?? []}
				estimatedItemSize={ROW_ESTIMATE}
				keyExtractor={(e) => e._id}
				ListEmptyComponent={
					state.items === undefined ? (
						<RowsSkeleton />
					) : (
						<View className="px-8 pt-18">
							<AppText
								center
								className="text-[15px] leading-[21.75px]"
								color="muted"
								variant="callout"
							>
								{state.empty}
							</AppText>
						</View>
					)
				}
				onEndReached={state.canLoadMore ? actions.loadMore : undefined}
				onEndReachedThreshold={LOAD_AHEAD}
				recycleItems
				renderItem={({ item }) => (
					<EntryRow actions={actions} entry={item} from={state.from} />
				)}
			/>
		</>
	);
}
