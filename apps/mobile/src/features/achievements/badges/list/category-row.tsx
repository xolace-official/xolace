import { FlatList, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import type { CategoryView } from "@/features/achievements/badges/badges-model";
import { BadgeTile } from "@/features/achievements/badges/list/badge-tile";

/** Production's Streak row mounts 25: a windowed list keeps only the near ones (and their canvases). */
const ROW_INITIAL = 5;
const ROW_WINDOW = 3;

/**
 * One category (production's `category-row.tsx`): "N of M unlocked", then
 * medallions scrolling sideways in the server's order (earned, the next rung
 * with its bar, then locked).
 */
export function CategoryRow({ category }: { category: CategoryView }) {
	return (
		// The board: 28 pt between rows, 20 pt sides.
		<View className="mt-7">
			<View className="flex-row items-baseline justify-between px-5">
				<AppText
					accessibilityRole="header"
					className="text-[17px] leading-[22px]"
					variant="body"
					weight="semibold"
				>
					{category.title}
				</AppText>
				<AppText
					className="text-[13px] leading-[17px]"
					color="subtle"
					variant="body"
				>
					{category.count}
				</AppText>
			</View>
			<FlatList
				contentContainerClassName="gap-3 px-5 pt-3"
				data={category.badges}
				horizontal
				initialNumToRender={ROW_INITIAL}
				keyExtractor={(b) => b.id}
				renderItem={({ item }) => <BadgeTile badge={item} />}
				showsHorizontalScrollIndicator={false}
				windowSize={ROW_WINDOW}
			/>
		</View>
	);
}
