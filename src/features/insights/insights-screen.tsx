// The insights screen: variant F, "Glass ticks" (#491). The free view (#517),
// filled in with numbers, "your usual" and the 7-day trend for Xolace+ (#518).
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/convex/_generated/api";
import { useStableQuery } from "@/src/lib/convex/use-stable-query";
import { AppText } from "@/src/components/shared/app-text";
import { AuroraArc } from "@/src/features/profile/components/aurora-arc";
import { usePlusEntitlement } from "@/src/features/purchases/use-plus-entitlement";
import { OverallDial } from "@/src/features/insights/overall-dial";
import { PartsOfLife } from "@/src/features/insights/parts-of-life";
import { UpsellScrollContext } from "@/src/features/insights/compounding-upsell";
import { TopBlur } from "@/src/components/shared/top-blur";
import { useHour } from "@/src/features/insights/use-hour";
import { CAVEAT, type InsightsView } from "@/src/features/insights/domains";

export function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { isPlus } = usePlusEntitlement();
  // Stable: `now` ticks hourly; hold the last result across the re-subscribe.
  const now = useHour();
  // plusView is null until the server sees the entitlement (webhook lag) and
  // again after a lapse; the free view covers both.
  const held = useStableQuery(api.compounding.insights.plusView, isPlus ? { now } : "skip");
  // A skip would keep the held Plus view; a lapse must drop it.
  const plus = isPlus ? held : undefined;
  // Stable: on a lapse the free view re-subscribes; hold its last result, don't blank.
  const free = useStableQuery(api.compounding.insights.freeView, plus ? "skip" : { now });
  const view: InsightsView | undefined = plus ?? free;
  // The upsell line below the dial spends itself only once scrolled into view.
  const [scrollListeners] = useState(() => new Set<() => void>());

  return (
    <View className="flex-1 bg-background">
      {/* Something behind the glass, so it doesn't read flat (#491 port notes). */}
      <AuroraArc height={insets.top + 280} />
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: "Steadiness",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <UpsellScrollContext value={scrollListeners}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: insets.bottom + 40 }}
        onScroll={() => scrollListeners.forEach((f) => f())}
        scrollEventThrottle={100}
      >
        {view && (
          <View className="gap-8 px-5">
            <OverallDial overall={view.overall} trend={view.overallTrend} locked={!isPlus} insights={view.insights} />
            {view.domains.length > 0 && <PartsOfLife domains={view.domains} isPlus={isPlus} insights={view.insights} />}
            <AppText className="text-[12px] text-muted text-center leading-5 px-4">{CAVEAT}</AppText>
          </View>
        )}
      </ScrollView>
      </UpsellScrollContext>
      <TopBlur height={insets.top + 70} />
    </View>
  );
}
