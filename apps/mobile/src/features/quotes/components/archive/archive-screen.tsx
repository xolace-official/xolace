import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppText } from "@/src/components/shared/app-text";
import type { Id } from "@/convex/_generated/dataModel";
import { QuoteStack } from "@/src/features/quotes/components/archive/quote-stack";


const SCREEN_OPTIONS = {
  animation: "slide_from_bottom",
  headerShown: true,
  headerTransparent: true,
  headerTitle: "OLD QUOTES",
  headerShadowVisible: false,
  headerBackVisible: true,
  headerBackButtonDisplayMode: "minimal",
} as const;

/**
 * The archive: a themed screen holding fixed-tint cards
 */
export function ArchiveScreen() {
  const { top } = useSafeAreaInsets();
  const [openId, setOpenId] = useState<Id<"daily_quotes"> | null>(null);

  // The count strip rides on `getToday` — the same query the poster's star
  // patches optimistically, so an unsave here moves it without a round trip.
  const savedCount = useQuery(api.dailyQuotes.getToday)?.savedCount ?? 0;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={SCREEN_OPTIONS} />

      <View className="gap-1 px-5 pb-2" style={{ paddingTop: top + 48 }}>
        {/*<AppText className="font-poster-display text-[22px] tracking-[1.6px] text-foreground">
          OLD QUOTES
        </AppText>*/}
        <AppText className="font-poster-body text-[12.5px] text-foreground/65 pt-3">
          {savedCount} kept
        </AppText>
      </View>

      <QuoteStack openId={openId} onToggle={setOpenId} />
    </View>
  );
}
