import { LegendList } from "@legendapp/list/react-native";
import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Stack, useLocalSearchParams } from "expo-router";
import { Skeleton } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import { useMiniPlayerInset } from "@/src/features/browse/now-playing/now-playing-store";
import { type Segment, type TopicRow, topicRows } from "../topic-sections";
import { BrowseFilterMenu, type FilterOption } from "./browse-filter-menu";
import {
	type BrowseFrom,
	FAMILY_LABEL,
	type TrackItem,
	TrackRow,
} from "./track-row";

type Row = TopicRow<TrackItem>;
type Params = { slug: string; family?: Segment; from?: BrowseFrom };
const FROM_VALUES = new Set<string>(["topic", "twig-more-like-this"]);
const keyExtractor = (row: Row) => row.key;
const getItemType = (row: Row) => row.type;

const titleFor = (slug: string) => {
	const words = slug.replace(/_/g, " ");
	return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * Topic screen (`topic/[slug]`, §9.3) — both families for one topic behind
 * an All / Music / Support audio header filter; a zero-count option is
 * disabled, not empty. The only list both families share, so rows carry the
 * family glyph. Episodes group under their series client-side.
 *
 * `?family=` preselects a segment and `?from=` tags the plays — this is how a
 * twig's "Browse more like this" lands on its topic filtered to its family
 * (§9.6) and its plays read `twig-more-like-this` in analytics.
 */
export function TopicScreen() {
	// Clears the floating mini-player off the last row (none on iOS 26).
	const playerInset = useMiniPlayerInset();
	const params = useLocalSearchParams<Params>();
	const { slug, family } = params;
	// URL params are untyped strings; only the two values that can land here are trusted.
	const from: BrowseFrom =
		params.from && FROM_VALUES.has(params.from) ? params.from : "topic";
	const posthog = usePostHog();
	const tracks = useQuery(api.browse.getTopic, { slug });
	const title = useQuery(api.browse.getTopicTitle, { slug });
	const [segment, setSegment] = useState<Segment>(
		family === "music" || family === "support" ? family : "all"
	);

	const renderItem = ({ item }: { item: Row }) => {
		if (item.type === "header") {
			return (
				<AppText className="px-4 pt-6 pb-1 font-semibold text-[13px] text-muted uppercase tracking-wide">
					{item.title}
				</AppText>
			);
		}
		return <TrackRow from={from} glyph track={item.track} />;
	};

	useEffect(() => {
		posthog.capture("browse_topic_opened", { topic: slug });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [slug]);

	const music = tracks?.filter((t) => t.family === "music").length ?? 0;
	const support = tracks?.filter((t) => t.family === "support").length ?? 0;
	const options: FilterOption<Segment>[] = [
		{ label: "All", value: "all" },
		{
			disabled: tracks !== undefined && music === 0,
			icon: "music.note",
			label: FAMILY_LABEL.music,
			value: "music",
		},
		{
			disabled: tracks !== undefined && support === 0,
			icon: "waveform",
			label: FAMILY_LABEL.support,
			value: "support",
		},
	];

	return (
		<>
			<Stack.Screen options={{ title: title ?? titleFor(slug) }} />
			<BrowseFilterMenu
				onChange={setSegment}
				options={options}
				title="Show"
				value={segment}
			/>
			{tracks === undefined ? (
				<ScrollView
					className="flex-1"
					contentContainerStyle={{ paddingTop: 8 }}
					contentInsetAdjustmentBehavior="automatic"
				>
					<View className="gap-3 px-4">
						<Skeleton className="h-17 rounded-none" />
						<Skeleton className="h-17 rounded-none" />
						<Skeleton className="h-17 rounded-none" />
					</View>
				</ScrollView>
			) : (
				<LegendList
					contentContainerStyle={{
						paddingBottom: 40 + playerInset,
						paddingTop: 8,
					}}
					contentInsetAdjustmentBehavior="automatic"
					data={topicRows(tracks, segment)}
					estimatedItemSize={68}
					getItemType={getItemType}
					keyExtractor={keyExtractor}
					recycleItems
					renderItem={renderItem}
				/>
			)}
		</>
	);
}
