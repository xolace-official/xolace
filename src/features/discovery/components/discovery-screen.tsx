import { ScrollView, View } from 'react-native';

import { CohortCard } from './cohort-card';
import { DiscoveryHeader } from './discovery-header';
import { DailyQuotesCard } from './daily-quotes-card';
import { DiscoveryTimelineSection } from './discovery-timeline-section';
import { KindlingTodayCard } from './kindling-today-card';
import { LibraryStrip } from '@/src/features/discovery/components/library-strip';
import { DOCK_CLEARANCE, ReflectDock } from './reflect-dock';
import { MINI_PLAYER_CLEARANCE, useMiniPlayerShown } from '@/src/features/browse/now-playing/now-playing-store';

/**
 * First tab. The masthead runs under the status bar, so this screen opts out of
 * both the stack header (see `_layout.tsx`) and automatic content insets, and
 * pads the safe area itself.
 */
export function DiscoveryScreen() {
  const lift = useMiniPlayerShown() ? MINI_PLAYER_CLEARANCE : 0;
  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        alwaysBounceVertical={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: DOCK_CLEARANCE + lift + 30 }}
      >
        <DiscoveryHeader />

        {/* Wide gap: Flux's feet and his glow overhang the cohort card's box,
          * so gap-3 read as almost nothing under him. */}
        <View className="gap-10 px-4 pt-10">
          <CohortCard />
          <KindlingTodayCard />
          <DailyQuotesCard />
        </View>

        <LibraryStrip />
        <DiscoveryTimelineSection />
      </ScrollView>

      <ReflectDock />
    </View>
  );
}
