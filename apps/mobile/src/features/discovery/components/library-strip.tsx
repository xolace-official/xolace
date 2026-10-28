import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { ShelfTile } from "@/features/browse/components/shelf-tile";
import { useUtcDay } from "@/features/browse/use-utc-day";
import { playSoftPress } from "@/lib/haptics";
import { LibraryStripSkeleton } from "./skeletons";

const TILE = 132;

/**
 * "Something to listen to" (docs/paths-v1.md §9.5, #341; was "From the library" —
 * that name now belongs to Lantern, #409) — the same query
 * as the hub's New shelf (rotating daily), ending in "See all" into the Browse tab. Hidden
 * entirely below one item, never padded. Recently-played and
 * recommended-for-you are fog (§11).
 */
export function LibraryStrip() {
	const router = useRouter();
	const posthog = usePostHog();
	const accent = useThemeColor("accent") as string;
	const clock = useUtcDay();
	const shelf = useQuery(api.browse.getNewShelf, clock);

	if (shelf === undefined) {
		return <LibraryStripSkeleton tile={TILE} />;
	}
	if (shelf.length === 0) {
		return null;
	}

	const seeAll = () => {
		playSoftPress();
		posthog.capture("discovery_library_strip_tapped");
		router.push("/browse");
	};

	return (
		<View className="mt-10">
			<View className="flex-row items-center justify-between px-4">
				<AppText className="font-semibold text-foreground text-lg">
					Something to listen to
				</AppText>
				<PressableFeedback
					accessibilityLabel="See all in Browse"
					accessibilityRole="button"
					onPress={seeAll}
				>
					<View className="flex-row items-center gap-0.5 py-1 pl-3">
						<AppText className="font-medium text-sm" style={{ color: accent }}>
							See all
						</AppText>
						<SymbolView
							name={{
								android: "chevron_right",
								ios: "chevron.right",
								web: "chevron_right",
							}}
							size={12}
							tintColor={accent}
							weight="semibold"
						/>
					</View>
				</PressableFeedback>
			</View>
			<ScrollView
				contentContainerStyle={{
					gap: 12,
					paddingHorizontal: 16,
					paddingTop: 12,
				}}
				horizontal
				showsHorizontalScrollIndicator={false}
			>
				{shelf.map((item) => (
					<ShelfTile
						from="discovery-strip"
						item={item}
						key={item._id}
						size={TILE}
					/>
				))}
			</ScrollView>
		</View>
	);
}
