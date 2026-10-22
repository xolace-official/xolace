// "Parts of your life" pieces: grid cell, list row with a flat tick meter
// (from clarity-main metrics/tick-bar), and the grid/list toggle (#491).
import { Pressable, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/src/components/shared/app-text";
import { useTokenColor } from "@/src/features/profile/hooks/use-token-color";
import { SteadinessRing } from "@/src/features/insights/steadiness-ring";
import { COMPOUNDING_SHORT, COMPOUNDING_WORD, DOMAIN_META, STAGE_WORD, icon, lastSeen, subOf, toneOf, trendBasis, type DomainItem } from "@/src/features/insights/domains";
import { TrendChip } from "@/src/features/insights/trend-chip";

export type DomainView = "grid" | "list";

const GRID = icon("circle.grid.2x2", "grid_view");
const LIST = icon("list.bullet", "view_list");
const TICKS = 36;

export function ViewToggle({ value, onChange }: { value: DomainView; onChange: (v: DomainView) => void }) {
  const [accentFg, muted] = [useTokenColor("accent-foreground"), useTokenColor("muted")];
  return (
    <View className="flex-row rounded-full bg-surface-secondary p-1">
      {(["grid", "list"] as const).map((v) => (
        <Pressable
          key={v}
          accessibilityRole="button"
          accessibilityLabel={`Show as ${v}`}
          accessibilityState={{ selected: value === v }}
          hitSlop={4}
          onPress={() => {
            if (v === value) return;
            Presets.System.selection(); // native segmented-control tick
            onChange(v);
          }}
          className={`rounded-full px-3 py-1.5 ${value === v ? "bg-accent" : ""}`}
        >
          <SymbolView name={v === "grid" ? GRID : LIST} size={15} tintColor={value === v ? accentFg : muted} />
        </Pressable>
      ))}
    </View>
  );
}

/** Xolace+ rows and cells select the detail card; free ones aren't pressable. */
type ItemProps = { d: DomainItem; selected?: boolean; onPress?: () => void };

const trendLabel = (t: number, since?: number | null) =>
  t === 0
    ? since == null ? ", same as last week" : `, same since ${trendBasis(since)}`
    : `, ${t > 0 ? "up" : "down"} ${Math.abs(t)} since ${trendBasis(since)}`;
const scoreLabel = (d: DomainItem) =>
  d.steadiness != null
    ? `, ${d.steadiness} out of 100${d.baseline != null ? `, usually ${d.baseline}` : ""}${d.trend != null ? trendLabel(d.trend, d.trendSince) : ""}`
    : "";

export function DomainCell({ d, selected, onPress }: ItemProps) {
  const { label, icon } = DOMAIN_META[d.domain];
  const warming = d.state === "warming";
  const word = warming ? "warming" : d.lastSeenAt !== null ? "Not recently" : d.compounding ? COMPOUNDING_WORD[d.compounding] : STAGE_WORD[d.state];
  const score = d.steadiness ?? null;
  return (
    <Pressable
      disabled={!onPress} onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined} accessibilityState={{ selected }}
      className={`w-[31%] items-center gap-1 rounded-2xl py-2 ${selected ? "bg-surface-secondary" : ""}`}
      accessible accessibilityLabel={`${label}, ${word}${scoreLabel(d)}`}
    >
      <SteadinessRing size={86} value={score} tone={toneOf(d)} dashed={warming} icon={icon}>
        {score !== null ? (
          <>
            <AppText className="text-[22px] font-bold leading-7">{score}</AppText>
            <AppText className="text-[9px] text-muted -mt-0.5">/100</AppText>
          </>
        ) : (
          <AppText className="text-[10px] text-muted text-center px-3">{word}</AppText>
        )}
      </SteadinessRing>
      <AppText numberOfLines={1} className="text-[11px] text-foreground/85">{label}</AppText>
      {d.lastSeenAt !== null && (
        <AppText className="text-[9px] text-muted">last seen {lastSeen(d.lastSeenAt)}</AppText>
      )}
      {toneOf(d) === "ember" && d.compounding && (
        <AppText numberOfLines={1} className="text-[9px] text-ember">{COMPOUNDING_SHORT[d.compounding]}</AppText>
      )}
    </Pressable>
  );
}

export function DomainRow({ d, selected, onPress }: ItemProps) {
  const { label, icon } = DOMAIN_META[d.domain];
  const [ink, muted] = [useTokenColor(toneOf(d)), useTokenColor("muted")];
  const warming = d.state === "warming";
  const sub = subOf(d);
  return (
    <Pressable
      disabled={!onPress} onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined} accessibilityState={{ selected }}
      className={`gap-3 rounded-2xl px-3 py-3 ${selected ? "bg-surface-secondary" : ""}`}
      accessible accessibilityLabel={`${label}, ${sub}${scoreLabel(d)}`}
    >
      <View className="flex-row items-center gap-3">
        <View className="size-10 rounded-xl bg-surface-secondary items-center justify-center">
          <SymbolView name={icon} size={17} tintColor={warming ? muted : ink} />
        </View>
        <View className="flex-1">
          <AppText className="text-[15px]">{label}</AppText>
          <AppText className={`text-[12px] ${d.compounding ? "text-ember" : "text-muted"}`}>{sub}</AppText>
        </View>
        {d.steadiness != null && <AppText className="text-[20px] font-bold">{d.steadiness}</AppText>}
        {d.trend != null && <TrendChip delta={d.trend} short />}
      </View>
      {!warming && <TickBar fill={(d.steadiness ?? 0) / 100} mark={d.baseline ?? null} ink={ink} />}
    </Pressable>
  );
}

/** Unfilled in the free view: the meter's shape, never its value. For Xolace+
 * the first `fill` share is inked and the person's usual stands taller in --foreground. */
function TickBar({ fill, mark, ink }: { fill: number; mark: number | null; ink: string }) {
  const [track, fg] = [useTokenColor("border"), useTokenColor("foreground")];
  const inked = Math.round(fill * TICKS);
  const markAt = mark !== null ? Math.max(0, Math.round((mark / 100) * TICKS) - 1) : -1;
  return (
    <View className="h-[22px] flex-row items-center justify-between">
      {Array.from({ length: TICKS }, (_, i) => (
        <View
          key={i}
          className={`w-1 rounded-full ${i === markAt ? "h-[22px]" : "h-3.5"}`}
          style={{ backgroundColor: i === markAt ? fg : i < inked ? ink : track }}
        />
      ))}
    </View>
  );
}
