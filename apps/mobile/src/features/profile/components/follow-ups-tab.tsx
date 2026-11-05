import { SkeletonGroup, Spinner } from "heroui-native";
import { View } from "react-native";
import { TabLegendList } from "react-native-collapsible-tab/legend-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { FollowUpRow } from "@/features/profile/components/follow-up-row";
import {
	type FollowUpListItem,
	useProfileFollowUps,
} from "@/features/profile/hooks/use-profile-follow-ups";

const ROW_ESTIMATE = 84;

/** The Follow-ups tab: what's waiting, what's coming, then every past
 * check-in by month, loaded a page at a time. */
export function FollowUpsTab() {
	const insets = useSafeAreaInsets();
	const { items, isLoadingMore, loadMore } = useProfileFollowUps();

	return (
		<TabLegendList
			contentContainerStyle={{
				paddingBottom: insets.bottom + 40,
				paddingHorizontal: 20,
			}}
			data={items ?? []}
			estimatedItemSize={ROW_ESTIMATE}
			getItemType={(item) => item.kind}
			keyExtractor={(item) => item.key}
			ListFooterComponent={
				isLoadingMore ? (
					<View className="items-center py-6">
						<Spinner size="sm" />
					</View>
				) : null
			}
			ListHeaderComponent={items ? null : <LoadingRows />}
			onEndReached={loadMore}
			onEndReachedThreshold={0.5}
			recycleItems
			renderItem={({ item }) => <Item item={item} />}
			showsVerticalScrollIndicator={false}
		/>
	);
}

function Item({ item }: { item: FollowUpListItem }) {
	switch (item.kind) {
		case "header":
			return (
				<View className="pt-6 pb-3">
					<AppText className="font-semibold text-[15px] text-foreground">
						{item.title}
					</AppText>
					{item.caption ? (
						<AppText className="mt-0.5 text-[12px] text-muted">
							{item.caption}
						</AppText>
					) : null}
				</View>
			);
		case "card":
			return (
				<View className="pb-2.5">
					<FollowUpRow card={item.card} />
				</View>
			);
		default:
			return <EmptyState />;
	}
}

function EmptyState() {
	return (
		<View className="items-center px-6 pt-14">
			<AppText className="font-semibold text-base text-foreground">
				No follow-ups yet
			</AppText>
			<AppText className="mt-2 text-center text-[13px] text-muted leading-5">
				After some reflections, Xolace checks back in a little later to see how
				it's sitting. Those check-ins land here.
			</AppText>
		</View>
	);
}

function LoadingRows() {
	return (
		<SkeletonGroup className="gap-2.5 pt-6">
			<SkeletonGroup.Item className="h-4 w-32 rounded-md" />
			{[0, 1, 2].map((i) => (
				<SkeletonGroup.Item className="h-[74px] w-full rounded-2xl" key={i} />
			))}
		</SkeletonGroup>
	);
}
