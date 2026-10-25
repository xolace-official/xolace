import { LegendList } from "@legendapp/list/react-native";
import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { Skeleton } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import { useMiniPlayerInset } from "@/src/features/browse/now-playing/now-playing-store";
import { CoverImage } from "@/src/features/library/cover-image";
import { playSoftPress } from "@/src/lib/haptics";

type Topic = FunctionReturnType<typeof api.browse.getTopics>[number];

const GUTTER = 16;
const GAP = 12;

const keyExtractor = (t: Topic) => t.slug;

function countLine(t: Topic) {
	const parts = [];
	if (t.supportCount > 0) {
		parts.push(`${t.supportCount} spoken`);
	}
	if (t.musicCount > 0) {
		parts.push(`${t.musicCount} music`);
	}
	return parts.join(" · ");
}

/**
 * Topic grid (`topics`, §9.3) — a grid of *topics*, one tile per shared topic
 * with ≥ 1 active track in either family. Two-up, square artwork.
 */
export function TopicGridScreen() {
	// Clears the floating mini-player off the last row (none on iOS 26).
	const playerInset = useMiniPlayerInset();
	const posthog = usePostHog();
	const topics = useQuery(api.browse.getTopics, {});
	const { width } = useWindowDimensions();
	const tile = (width - GUTTER * 2 - GAP) / 2;

	useEffect(() => {
		posthog.capture("browse_topics_opened");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	if (topics === undefined) {
		return (
			<ScrollView
				className="flex-1"
				contentContainerStyle={{
					paddingHorizontal: GUTTER - GAP / 2,
					paddingTop: 8,
				}}
				contentInsetAdjustmentBehavior="automatic"
			>
				<View className="flex-row flex-wrap">
					{[0, 1, 2, 3].map((i) => (
						<View
							key={i}
							style={{
								marginBottom: GAP + 4,
								marginHorizontal: GAP / 2,
								width: tile,
							}}
						>
							<Skeleton
								className="rounded-xl"
								style={{ height: tile, width: tile }}
							/>
							<View className="mt-2 gap-1.5">
								<Skeleton className="h-3.75 w-3/4 rounded" />
								<Skeleton className="h-3.25 w-1/2 rounded" />
							</View>
						</View>
					))}
				</View>
			</ScrollView>
		);
	}

	return (
		<LegendList
			contentContainerStyle={{
				paddingBottom: 40 + playerInset,
				paddingHorizontal: GUTTER - GAP / 2,
				paddingTop: 8,
			}}
			contentInsetAdjustmentBehavior="automatic"
			data={topics}
			estimatedItemSize={tile + 48}
			keyExtractor={keyExtractor}
			numColumns={2}
			recycleItems
			renderItem={({ item }) => (
				<Pressable
					accessibilityLabel={`${item.title}, ${countLine(item)}`}
					accessibilityRole="button"
					className="active:opacity-60"
					onPress={() => {
						playSoftPress();
						router.push(`/browse/topic/${item.slug}` as never);
					}}
					style={{
						marginBottom: GAP + 4,
						marginHorizontal: GAP / 2,
						width: tile,
					}}
				>
					<View
						className="overflow-hidden rounded-xl bg-surface-tertiary"
						style={{ height: tile, width: tile }}
					>
						<CoverImage
							recyclingKey={item.slug}
							style={{ height: tile, width: tile }}
							thumbhash={item.thumbhash}
							uri={item.thumbUrl}
						/>
					</View>
					<View className="mt-2">
						<AppText className="font-semibold text-[15px]" numberOfLines={1}>
							{item.title}
						</AppText>
						<AppText className="text-[13px] text-muted" numberOfLines={1}>
							{countLine(item)}
						</AppText>
					</View>
				</Pressable>
			)}
		/>
	);
}
