import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { ScrollView, View } from "react-native";

import { api } from "@/convex/_generated/api";
import { AppText } from "@/src/components/shared/app-text";
import { ShelfTile } from "@/src/features/browse/components/shelf-tile";
import { useUtcDay } from "@/src/features/browse/use-utc-day";
import { LibraryStripSkeleton } from "./skeletons";
import { playSoftPress } from "@/src/lib/haptics";

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
  const day = useUtcDay();
  const shelf = useQuery(api.browse.getNewShelf, { day });

  if (shelf === undefined) return <LibraryStripSkeleton tile={TILE} />;
  if (shelf.length === 0) return null;

  const seeAll = () => {
    playSoftPress();
    posthog.capture("discovery_library_strip_tapped");
    router.push("/browse");
  };

  return (
    <View className="mt-10">
      <View className="flex-row items-center justify-between px-4">
        <AppText className="text-lg font-semibold text-foreground">Something to listen to</AppText>
        <PressableFeedback onPress={seeAll} accessibilityRole="button" accessibilityLabel="See all in Browse">
          <View className="flex-row items-center gap-0.5 py-1 pl-3">
            <AppText className="text-sm font-medium" style={{ color: accent }}>
              See all
            </AppText>
            <SymbolView
              name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
              size={12}
              weight="semibold"
              tintColor={accent}
            />
          </View>
        </PressableFeedback>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 12 }}
      >
        {shelf.map((item) => (
          <ShelfTile key={item._id} item={item} from="discovery-strip" size={TILE} />
        ))}
      </ScrollView>
    </View>
  );
}
