// Every touched domain, as a ring grid or tick-meter list on glass (#491).
// Free users get unfilled rings and the "Unlock numbers" pill (#513);
// Xolace+ gets numbers, and tapping a domain opens its detail card (#518).
// A free domain compounding may carry the upsell (#524): no number, just the word.

import { SymbolView } from "expo-symbols";
import { Chip } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { GlassSurface } from "@/components/shared/glass-surface";
import {
	CompoundingUpsellLine,
	type Upsell,
	useHeldUpsell,
	useOpenUpsell,
} from "@/features/insights/compounding-upsell";
import { DetailCard } from "@/features/insights/detail-card";
import {
	DomainCell,
	DomainRow,
	type DomainView,
	ViewToggle,
} from "@/features/insights/domain-list";
import {
	type DomainItem,
	type Insight,
	icon,
} from "@/features/insights/domains";
import { usePaywall } from "@/features/purchases/use-paywall";
import { useTokenColor } from "@/lib/use-token-color";

const LOCK = icon("lock", "lock");

export function PartsOfLife({
	domains: touched,
	isPlus,
	insights,
	upsell: live,
}: {
	domains: DomainItem[];
	isPlus: boolean;
	insights?: Insight[];
	upsell?: Upsell | null;
}) {
	const [view, setView] = useState<DomainView>("grid");
	const accent = useTokenColor("accent");
	const openPaywall = usePaywall((s) => s.open);
	const upsell = useHeldUpsell(live, "");
	const openUpsell = useOpenUpsell();
	const domains = touched.map((d) =>
		d.domain === upsell?.domain
			? { ...d, compounding: "compounding" as const }
			: d
	);
	const [selKey, setSelKey] = useState<DomainItem["domain"]>();
	// Only a domain with a number has a detail card; free numbers never arrive.
	const scored = domains.filter((d) => d.steadiness != null);
	const sel = scored.find((d) => d.domain === selKey) ?? scored[0];
	const select = (d: DomainItem) =>
		d.steadiness == null
			? d.domain === upsell?.domain
				? openUpsell
				: undefined
			: () => {
					if (d.domain !== sel?.domain) {
						Presets.flick(); // the app's select cue
					}
					setSelKey(d.domain);
				};

	return (
		<View className="gap-3">
			<View className="flex-row items-center justify-between">
				<AppText className="font-medium text-[20px]">
					Parts of your life
				</AppText>
				<ViewToggle onChange={setView} value={view} />
			</View>
			{!isPlus && (
				<Chip
					accessibilityRole="button"
					color="default"
					onPress={() => openPaywall("steadiness_numbers")}
					size="md"
					variant="secondary"
				>
					<SymbolView name={LOCK} size={13} tintColor={accent} />
					<Chip.Label>Unlock numbers</Chip.Label>
				</Chip>
			)}
			{/* Above the domains, so it's on screen when it's spent (#524). */}
			{upsell && <CompoundingUpsellLine glass upsell={upsell} />}
			<GlassSurface className={view === "grid" ? "p-4" : "p-2"} radius={24}>
				{view === "grid" ? (
					<View className="flex-row flex-wrap justify-between gap-y-5">
						{domains.map((d) => (
							<DomainCell
								d={d}
								key={d.domain}
								onPress={select(d)}
								selected={d === sel}
							/>
						))}
						{/* Keep a short last row left-aligned under justify-between. */}
						{domains.length % 3 === 2 && <View className="w-[31%]" />}
					</View>
				) : (
					domains.map((d) => (
						<DomainRow
							d={d}
							key={d.domain}
							onPress={select(d)}
							selected={d === sel}
						/>
					))
				)}
			</GlassSurface>
			{sel?.steadiness != null && (
				<DetailCard d={sel} insights={insights} value={sel.steadiness} />
			)}
		</View>
	);
}
