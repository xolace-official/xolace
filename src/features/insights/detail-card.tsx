// Xolace+ detail for the selected domain (#491): a half tick-gauge whose ring
// centre sits on the card's top edge, so the card's rounded clip cuts the top
// arc (from clarity-main daily-goal-card). The taller tick is the person's usual.
// Compounding and easing read ember, and hand off to the kindling a session
// about this domain lit (#520). Its own steadiness insights sit under the name (#525, #526).
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { AppText } from "@/src/components/shared/app-text";
import { useTokenColor } from "@/src/features/profile/hooks/use-token-color";
import { playSoftPress } from "@/src/lib/haptics";
import { GlassSurface } from "@/src/components/shared/glass-surface";
import { TickGauge, gaugeSize } from "@/src/features/insights/glass";
import { DOMAIN_META, icon, subOf, toneOf, type DomainItem, type Insight, type Tone } from "@/src/features/insights/domains";
import { SteadinessInsights } from "@/src/features/insights/steadiness-insights";
import { TrendChip } from "@/src/features/insights/trend-chip";

const RADIUS = 120;
const TICK = 30;
const TICK_WIDTH = 9;
const CENTER_Y = 18; // ring centre, measured from the card's top edge
const WINDOW = 150;
const FLAME = icon("flame", "local_fire_department");
const CHEVRON = icon("chevron.right", "chevron_right");

export function DetailCard({ d, value, insights }: { d: DomainItem; value: number; insights?: Insight[] }) {
  const baseline = d.baseline ?? null;
  return (
    <GlassSurface radius={24} className="overflow-hidden px-5 pb-5 gap-4">
      <HalfGauge value={value} baseline={baseline} tone={toneOf(d)} />
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <AppText className="text-[17px] font-medium">{DOMAIN_META[d.domain].label}</AppText>
          <AppText className="text-[13px] text-muted mt-0.5">
            {subOf(d)}
            {baseline !== null ? ` · usually ${baseline}` : ""}
          </AppText>
        </View>
        {d.trend != null && <TrendChip delta={d.trend} />}
      </View>
      <SteadinessInsights insights={insights} domain={d.domain} />
      {d.kindling && <KindlingRow />}
    </GlassSurface>
  );
}

/** Kindling is per session: offered only when the active one came from a session about this domain. */
function KindlingRow() {
  const router = useRouter();
  const [ember, muted] = [useTokenColor("ember"), useTokenColor("muted")];
  return (
    <Pressable
      onPress={() => {
        playSoftPress();
        router.push("/(protected)/kindling");
      }}
      accessibilityRole="button" accessibilityLabel="Open your kindling"
      className="flex-row items-center gap-3 rounded-2xl bg-surface-secondary px-4 py-3 active:opacity-70"
    >
      <SymbolView name={FLAME} size={16} tintColor={ember} />
      <View className="flex-1">
        <AppText className="text-[14px]">Your kindling</AppText>
        <AppText className="text-[12px] text-muted">A few things from a session about this</AppText>
      </View>
      <SymbolView name={CHEVRON} size={13} tintColor={muted} />
    </Pressable>
  );
}

function HalfGauge({ value, baseline, tone }: { value: number; baseline: number | null; tone: Tone }) {
  const fill = useTokenColor(tone);
  const track = useTokenColor("border");
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(value / 100, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [value, progress]);

  const size = gaugeSize(RADIUS, TICK_WIDTH, TICK, baseline !== null);
  return (
    <View
      style={{ height: WINDOW }}
      accessible accessibilityLabel={`${value} out of 100${baseline !== null ? `, usually ${baseline}` : ""}`}
    >
      <View className="absolute self-center" style={{ top: CENTER_Y - size / 2 }}>
        <TickGauge
          ticks={17} startAngle={180} sweep={-180} radius={RADIUS} tickLength={TICK} tickWidth={TICK_WIDTH}
          progress={progress} fill={fill} track={track} mark={baseline !== null ? baseline / 100 : null}
        />
      </View>
      <View className="absolute inset-x-0 items-center" style={{ top: CENTER_Y + 4 }}>
        <AppText className="text-[13px] text-muted">now</AppText>
        <AppText className="text-[40px] leading-[46px] font-bold tracking-tight">{value}</AppText>
      </View>
    </View>
  );
}
