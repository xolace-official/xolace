import { ActivityIndicator, View } from "react-native";
import { TabLegendList } from "react-native-collapsible-tab/legend-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { EmptyState } from "@/components/shared/empty-state";
import { COPY } from "@/features/you/copy";
import {
	FollowUpRow,
	WaitingCard,
} from "@/features/you/home/follow-ups/follow-up-card";
import type { FollowUpItem } from "@/features/you/home/follow-ups-model";
import { useYouHome } from "@/features/you/home/you-data";

const ROW_ESTIMATE = 84;
const TAB_BAR_ROOM = 110;

export function FollowUpsTab() {
	const insets = useSafeAreaInsets();
	const { state, actions } = useYouHome();
	const { items, loadingMore } = state.followUps;
	return (
		<TabLegendList
			contentContainerStyle={{
				paddingBottom: insets.bottom + TAB_BAR_ROOM,
				paddingHorizontal: 20,
				paddingTop: 10,
			}}
			data={items ?? []}
			estimatedItemSize={ROW_ESTIMATE}
			getItemType={(item) => item.kind}
			keyExtractor={(item) => item.key}
			ListFooterComponent={
				loadingMore ? (
					<View className="items-center py-6">
						<ActivityIndicator />
					</View>
				) : null
			}
			onEndReached={actions.loadMoreFollowUps}
			onEndReachedThreshold={0.5}
			recycleItems
			renderItem={({ item }) => <Item item={item} />}
			showsVerticalScrollIndicator={false}
		/>
	);
}

function Item({ item }: { item: FollowUpItem }) {
	switch (item.kind) {
		case "header":
			return (
				<AppText
					accessibilityRole="header"
					className="mx-1 mt-1.5 mb-2.5 text-[13px] uppercase tracking-[0.52px]"
					color="subtle"
					variant="footnote"
					weight="bold"
				>
					{item.title}
				</AppText>
			);
		case "card":
			return (
				<View className="pb-3.5">
					{item.look.kind === "check-in" || item.look.kind === "close" ? (
						<WaitingCard card={item.card} look={item.look} />
					) : (
						<FollowUpRow card={item.card} look={item.look} />
					)}
				</View>
			);
		default:
			return (
				<EmptyState
					body={COPY.followUps.empty}
					className="py-10"
					face
					title={COPY.followUps.emptyTitle}
				/>
			);
	}
}
