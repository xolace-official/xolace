// Every touched domain, as a ring grid or tick-meter list on glass (#491).
// Free users get unfilled rings and the "Unlock numbers" pill (#513);
// Xolace+ gets numbers, and tapping a domain opens its detail card (#518).
// A free domain compounding may carry the upsell (#524): no number, just the word.
import { useState } from "react";
import { View } from "react-native";
import { Chip } from "heroui-native";
import { SymbolView } from "expo-symbols";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/src/components/shared/app-text";
import { useTokenColor } from "@/src/features/profile/hooks/use-token-color";
import { usePaywall } from "@/src/features/purchases/use-paywall";
import { GlassSurface } from "@/src/components/shared/glass-surface";
import { DomainCell, DomainRow, ViewToggle, type DomainView } from "@/src/features/insights/domain-list";
import { DetailCard } from "@/src/features/insights/detail-card";
import { CompoundingUpsellLine, useCompoundingUpsell, useOpenUpsell } from "@/src/features/insights/compounding-upsell";
import { icon, type DomainItem, type Insight } from "@/src/features/insights/domains";

const LOCK = icon("lock", "lock");

export function PartsOfLife({
  domains: touched, isPlus, insights,
}: { domains: DomainItem[]; isPlus: boolean; insights?: Insight[] }) {
  const [view, setView] = useState<DomainView>("grid");
  const accent = useTokenColor("accent");
  const openPaywall = usePaywall((s) => s.open);
  const upsell = useCompoundingUpsell({});
  const openUpsell = useOpenUpsell();
  const domains = touched.map((d) => (d.domain === upsell?.domain ? { ...d, compounding: "compounding" as const } : d));
  const [selKey, setSelKey] = useState<DomainItem["domain"]>();
  // Only a domain with a number has a detail card; free numbers never arrive.
  const scored = domains.filter((d) => d.steadiness != null);
  const sel = scored.find((d) => d.domain === selKey) ?? scored[0];
  const select = (d: DomainItem) =>
    d.steadiness != null
      ? () => {
          if (d.domain !== sel?.domain) Presets.flick(); // the app's select cue
          setSelKey(d.domain);
        }
      : d.domain === upsell?.domain
        ? openUpsell
        : undefined;

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <AppText className="text-[20px] font-medium">Parts of your life</AppText>
        <ViewToggle value={view} onChange={setView} />
      </View>
      {!isPlus && (
        <Chip
          size="md" variant="secondary" color="default"
          onPress={() => openPaywall("steadiness_numbers")}
          accessibilityRole="button"
        >
          <SymbolView name={LOCK} size={13} tintColor={accent} />
          <Chip.Label>Unlock numbers</Chip.Label>
        </Chip>
      )}
      {/* Above the domains, so it's on screen when it's spent (#524). */}
      {upsell && <CompoundingUpsellLine upsell={upsell} glass />}
      <GlassSurface radius={24} className={view === "grid" ? "p-4" : "p-2"}>
        {view === "grid" ? (
          <View className="flex-row flex-wrap justify-between gap-y-5">
            {domains.map((d) => (
              <DomainCell key={d.domain} d={d} selected={d === sel} onPress={select(d)} />
            ))}
            {/* Keep a short last row left-aligned under justify-between. */}
            {domains.length % 3 === 2 && <View className="w-[31%]" />}
          </View>
        ) : (
          domains.map((d) => <DomainRow key={d.domain} d={d} selected={d === sel} onPress={select(d)} />)
        )}
      </GlassSurface>
      {sel?.steadiness != null && <DetailCard d={sel} value={sel.steadiness} insights={insights} />}
    </View>
  );
}
