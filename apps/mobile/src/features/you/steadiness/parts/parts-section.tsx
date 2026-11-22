import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import {
	DetailCard,
	LockedDetail,
} from "@/features/you/steadiness/detail/detail-card";
import {
	UnlockNumbers,
	UpsellLine,
} from "@/features/you/steadiness/parts/doors";
import { PartsGrid } from "@/features/you/steadiness/parts/parts-grid";
import { PartsHeader } from "@/features/you/steadiness/parts/parts-header";
import { PartsList } from "@/features/you/steadiness/parts/parts-list";
import { ViewFade } from "@/features/you/steadiness/parts/view-fade";
import { useSteadinessScreen } from "@/features/you/steadiness/steadiness-data";
import { selectedPart } from "@/features/you/steadiness/steadiness-model";
import { useSteadinessUi } from "@/features/you/steadiness/steadiness-ui";

export function PartsSection({
	clock,
	onPartsY,
	onUpsellPlaced,
}: {
	clock: SharedValue<number>;
	onPartsY: (y: number) => void;
	onUpsellPlaced: (y: number, height: number) => void;
}) {
	const { state, actions } = useSteadinessScreen();
	const ui = useSteadinessUi();
	if (!state || state.parts.length === 0) {
		return null;
	}
	const { parts, plus, doors, now, upsell } = state;
	const selected = plus ? selectedPart(parts, ui.picked) : null;
	const peeked = doors
		? (parts.find((p) => p.domain === ui.peek) ?? null)
		: null;
	const current = plus ? (selected?.domain ?? null) : (peeked?.domain ?? null);
	const tap = (part: (typeof parts)[number]) =>
		ui.tap(part, { doors, plus }, current);
	return (
		<>
			<View onLayout={(e) => onPartsY(e.nativeEvent.layout.y)}>
				<PartsHeader />
			</View>
			{doors ? <UnlockNumbers onPress={actions.numbers} /> : null}
			{upsell ? (
				<UpsellLine
					domain={upsell.domain}
					onPlaced={onUpsellPlaced}
					onPress={actions.upsell}
				/>
			) : null}
			<PartsGrid
				active={ui.view === "grid"}
				clock={clock}
				current={current}
				doors={doors}
				onTap={tap}
				parts={parts}
				plus={plus}
			/>
			<PartsList
				active={ui.view === "list"}
				doors={doors}
				now={now}
				onKindling={actions.kindling}
				onTap={tap}
				open={plus ? ui.open : null}
				parts={parts}
				plus={plus}
			/>
			{selected ? (
				<ViewFade active={ui.view === "grid"}>
					<DetailCard now={now} onKindling={actions.kindling} part={selected} />
				</ViewFade>
			) : null}
			{peeked ? (
				<LockedDetail
					key={peeked.domain}
					onUnlock={actions.numbers}
					part={peeked}
				/>
			) : null}
		</>
	);
}
