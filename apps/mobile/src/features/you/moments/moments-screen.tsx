import { LegendList } from "@legendapp/list/react-native";
import { Stack } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { EmptyState } from "@/components/shared/empty-state";
import { MOMENTS_COPY } from "@/features/you/moments/copy";
import { MomentCard } from "@/features/you/moments/list/moment-card";
import { MomentsSkeleton } from "@/features/you/moments/list/moments-skeleton";
import { WindowDoor } from "@/features/you/moments/list/window-door";
import { useMomentsScreen } from "@/features/you/moments/moments-data";
import type { ListItem } from "@/features/you/moments/moments-model";
import { useAccessibilityInfo } from "@/helpers/hooks/use-accessability-info";
import { useHeaderOptions } from "@/lib/header-options";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const L = MOMENTS_COPY.list;
const CARD_ESTIMATE = 128;
const LOAD_AHEAD = 0.4;
const DOOR_CLEAR = 140;
const END_CLEAR = 40;

/**
 * Moments (was Timeline): the mirror's line leads each card, grouped by day under a native large
 * title that folds on scroll. The list is the screen's first native view, with no wrapper: iOS
 * folds the large title (and draws the soft edge) only for a scroll view it finds there. The
 * header's `contentStyle` paints the background; the free window's door floats after the list.
 */
export function MomentsScreen() {
	const { state, actions } = useMomentsScreen();
	const header = useHeaderOptions();
	const reduced = useEffectiveReducedMotion();
	const { screenReaderEnabled } = useAccessibilityInfo();
	const [arriving, setArriving] = useState(true);
	const door = state?.windowDays ?? null;
	return (
		<>
			<Stack.Screen
				options={{
					...header,
					headerBackTitle: "Back",
					headerShown: true,
					title: L.title,
				}}
			/>
			<LegendList
				contentContainerClassName="px-4"
				contentContainerStyle={{
					paddingBottom: door === null ? END_CLEAR : DOOR_CLEAR,
				}}
				contentInsetAdjustmentBehavior="automatic"
				data={state?.items ?? []}
				estimatedItemSize={CARD_ESTIMATE}
				getItemType={(item) => item.kind}
				keyExtractor={(item) => item.id}
				ListEmptyComponent={
					state === undefined ? (
						<MomentsSkeleton />
					) : (
						<EmptyState
							body={L.empty}
							className="pt-35"
							face
							title={L.emptyTitle}
						/>
					)
				}
				ListFooterComponent={
					state?.loadingMore ? <ActivityIndicator className="py-6" /> : null
				}
				onEndReached={state?.canLoadMore ? actions.loadMore : undefined}
				onEndReachedThreshold={LOAD_AHEAD}
				onScrollBeginDrag={() => setArriving(false)}
				recycleItems={false}
				renderItem={({ item }: { item: ListItem }) =>
					item.kind === "when" ? (
						<AppText
							accessibilityRole="header"
							className="px-1 pt-2 pb-2.5 text-[14px]"
							color="muted"
							variant="callout"
							weight="semibold"
						>
							{item.when}
						</AppText>
					) : (
						<View className="pb-2.5">
							<MomentCard
								moment={item.moment}
								reduced={reduced}
								rise={arriving ? item.index : null}
								zoom={!(reduced || screenReaderEnabled)}
							/>
						</View>
					)
				}
				showsVerticalScrollIndicator={false}
			/>
			{door === null ? null : (
				<WindowDoor
					days={door}
					onSeeAll={actions.seeAll}
					onSeen={actions.doorSeen}
				/>
			)}
		</>
	);
}
