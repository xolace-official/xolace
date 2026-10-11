// Steadiness now vs 7 days ago (#510). Down is warning (amber), never danger:
// a dip is room to grow, not a failing grade.
import { Chip } from "heroui-native";
import { SymbolView } from "expo-symbols";
import { useTokenColor } from "@/src/features/profile/hooks/use-token-color";
import { usePaywall } from "@/src/features/purchases/use-paywall";
import { icon } from "@/src/features/insights/domains";

const UP = icon("arrow.up", "arrow_upward");
const DOWN = icon("arrow.down", "arrow_downward");
const LOCK = icon("lock", "lock");

/** `short` drops "vs last week" where the row already says what it is. */
export function TrendChip({ delta, short }: { delta: number; short?: boolean }) {
  const color = delta > 0 ? "success" : delta < 0 ? "warning" : "default";
  const tint = useTokenColor(color === "default" ? "muted" : color);
  const label =
    delta === 0
      ? short ? "same" : "same as last week"
      : `${delta > 0 ? "+" : ""}${delta}${short ? "" : " vs last week"}`;
  return (
    <Chip
      size="sm" variant="soft" color={color}
      accessibilityLabel={delta === 0 ? "Same as last week" : `${delta > 0 ? "Up" : "Down"} ${Math.abs(delta)} since last week`}
    >
      {delta !== 0 && <SymbolView name={delta > 0 ? UP : DOWN} size={11} tintColor={tint} />}
      <Chip.Label>{label}</Chip.Label>
    </Chip>
  );
}

/** The free view's upsell: no direction, no value — a locked ↓ would sell "find out how bad it is". */
export function LockedTrendChip() {
  const accent = useTokenColor("accent");
  const openPaywall = usePaywall((s) => s.open);
  return (
    <Chip
      size="sm" variant="secondary" color="default"
      onPress={() => openPaywall("steadiness_numbers")}
      accessibilityRole="button" accessibilityLabel="Locked: change since last week. Opens Xolace+."
    >
      <SymbolView name={LOCK} size={11} tintColor={accent} />
      <Chip.Label>vs last week</Chip.Label>
    </Chip>
  );
}
