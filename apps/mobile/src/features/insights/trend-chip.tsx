// Steadiness now vs 7 days ago (#510). Down is warning (amber), never danger:
// a dip is room to grow, not a failing grade.

import { SymbolView } from "expo-symbols";
import { Chip } from "heroui-native";
import { icon, trendBasis } from "@/features/insights/domains";
import { usePaywall } from "@/features/purchases/use-paywall";
import { useTokenColor } from "@/lib/use-token-color";

const UP = icon("arrow.up", "arrow_upward");
const DOWN = icon("arrow.down", "arrow_downward");
const LOCK = icon("lock", "lock");

/** `short` drops "vs last week". `since` is set when the domain was quiet a week ago: the delta
 * runs from its last reading ("since April"). */
export function TrendChip({
	delta,
	short,
	since,
}: {
	delta: number;
	short?: boolean;
	since?: number | null;
}) {
	const color = delta > 0 ? "success" : delta < 0 ? "warning" : "default";
	const tint = useTokenColor(color === "default" ? "muted" : color);
	const basis = trendBasis(since);
	const suffix = since == null ? " vs last week" : ` since ${basis}`;
	const label =
		delta === 0
			? short
				? "same"
				: since == null
					? "same as last week"
					: `same since ${basis}`
			: `${delta > 0 ? "+" : ""}${delta}${short ? "" : suffix}`;
	return (
		<Chip
			size="sm"
			variant="soft"
			color={color}
			accessibilityLabel={
				delta === 0
					? since == null
						? "Same as last week"
						: `Same since ${basis}`
					: `${delta > 0 ? "Up" : "Down"} ${Math.abs(delta)} since ${basis}`
			}
		>
			{delta !== 0 && (
				<SymbolView name={delta > 0 ? UP : DOWN} size={11} tintColor={tint} />
			)}
			<Chip.Label>{label}</Chip.Label>
		</Chip>
	);
}

/** The free view's upsell: no direction, no value. A locked ↓ would sell "find out how bad it
 * is". */
export function LockedTrendChip() {
	const accent = useTokenColor("accent");
	const openPaywall = usePaywall((s) => s.open);
	return (
		<Chip
			size="sm"
			variant="secondary"
			color="default"
			onPress={() => openPaywall("steadiness_numbers")}
			accessibilityRole="button"
			accessibilityLabel="Locked: change since last week. Opens Xolace+."
		>
			<SymbolView name={LOCK} size={11} tintColor={accent} />
			<Chip.Label>vs last week</Chip.Label>
		</Chip>
	);
}
