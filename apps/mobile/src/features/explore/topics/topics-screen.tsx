import { Stack } from "expo-router";
import { Platform, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { SkeletonBreath } from "@/components/shared/skeleton";
import { COPY } from "@/features/explore/copy";
import { EXS, GRID } from "@/features/explore/explore-style";
import { FoldedEdge, useSmallBarFold } from "@/features/explore/folded-edge";
import { TileSkeleton, TopicTile } from "@/features/explore/topics/topic-tile";
import { useTopicsScreen } from "@/features/explore/topics/topics-data";
import { useHeaderOptions } from "@/lib/header-options";
import { useMiniPlayerInset } from "@/lib/now-playing/now-playing-store";

const SKELETON_TILES = 4;
const IOS = Platform.OS === "ios";

/**
 * Topics (handoff `explore-doors.md` §2): production's grid of every topic, two columns,
 * alphabetical, each tile zooming into its topic. Scrolled, the page fills in behind the bar.
 */
export function TopicsScreen() {
	const { state } = useTopicsScreen();
	const header = useHeaderOptions("small");
	const insets = useSafeAreaInsets();
	// Clears the floating mini player off the last row (none on iOS 26).
	const playerInset = useMiniPlayerInset();
	const { width } = useWindowDimensions();
	const tile = (width - GRID.gutter * 2 - GRID.gap) / 2;
	const fold = useSmallBarFold(insets.top);
	const topics = state.topics;

	return (
		<>
			<Stack.Screen options={{ ...header, title: COPY.topics }} />
			<ScrollView
				className="bg-background"
				contentContainerClassName="flex-row flex-wrap"
				contentContainerStyle={{
					columnGap: GRID.gap,
					paddingBottom: EXS.bottom + playerInset,
					paddingHorizontal: GRID.gutter,
					paddingTop: GRID.top,
					rowGap: GRID.rowGap,
				}}
				contentInsetAdjustmentBehavior="automatic"
				onScroll={fold.onScroll}
				scrollEventThrottle={32}
			>
				{topics === undefined ? (
					<SkeletonBreath
						className="w-full flex-row flex-wrap"
						label={COPY.loading}
						style={{ columnGap: GRID.gap, rowGap: GRID.rowGap }}
					>
						{Array.from({ length: SKELETON_TILES }, (_, i) => (
							<TileSkeleton key={i} size={tile} />
						))}
					</SkeletonBreath>
				) : (
					topics.map((t) => <TopicTile key={t.slug} size={tile} tile={t} />)
				)}
				{topics?.length === 0 ? (
					<View className="w-full px-8 pt-18">
						<AppText center color="muted" variant="callout">
							{COPY.empty}
						</AppText>
					</View>
				) : null}
			</ScrollView>
			{IOS ? <FoldedEdge barBottom={fold.barBottom} on={fold.folded} /> : null}
		</>
	);
}
