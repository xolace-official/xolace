import { useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "@/features/you/copy";
import { PartRow } from "@/features/you/home/steadiness/part-row";
import { SteadinessFace } from "@/features/you/home/steadiness/steadiness-face";
import {
	type SteadinessCard as Card,
	litTicks,
} from "@/features/you/home/steadiness/steadiness-model";
import { FAN_W, TickFan } from "@/features/you/home/steadiness/tick-fan";
import { InfoButton, InfoTip } from "@/features/you/info-tip";
import { Surface } from "@/features/you/surface";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

const FACE = 48;
const TIP_TOP = 44;

export function SteadinessCard({
	card,
	onSeeAll,
}: {
	card: Card;
	onSeeAll: () => void;
}) {
	const [info, setInfo] = useState(false);
	const accent = useTokenColor("accent");
	return (
		<Surface className="p-4">
			<View className="flex-row items-center gap-1.75">
				<AppText
					accessibilityRole="header"
					className="text-[17px] leading-[22px] tracking-[-0.17px]"
					variant="headline"
				>
					{COPY.steadiness.title}
				</AppText>
				<InfoButton
					label={COPY.steadiness.infoLabel}
					onPress={() => setInfo((v) => !v)}
				/>
				<PressScale
					accessibilityLabel={COPY.steadiness.allLabel}
					accessibilityRole="button"
					className="ml-auto flex-row items-center gap-0.75"
					haptic={playSoftPress}
					hitSlop={10}
					onPress={onSeeAll}
				>
					<AppText
						className="text-[14px]"
						color="accent"
						variant="callout"
						weight="semibold"
					>
						{COPY.steadiness.seeAll}
					</AppText>
					<Icon
						color={accent}
						name={{ android: "chevron_right", ios: "chevron.right" }}
						size={11}
						weight="bold"
					/>
				</PressScale>
			</View>

			<View className="mt-3 flex-row items-center gap-4">
				<View>
					<TickFan lit={card.lit ? litTicks(card.score) : 0} />
					<View
						className="absolute bottom-0"
						style={{ left: FAN_W / 2 - FACE / 2 }}
					>
						<SteadinessFace score={card.lit ? card.score : null} size={FACE} />
					</View>
				</View>
				{card.lit ? <Score card={card} /> : <NotLit known={card.known} />}
			</View>

			{card.parts.length > 0 ? (
				<View className="mt-3.5">
					{card.parts.map((p) => (
						<PartRow key={p.domain} part={p} />
					))}
				</View>
			) : null}

			{info ? (
				<InfoTip
					body={COPY.steadiness.info}
					onClose={() => setInfo(false)}
					title={COPY.steadiness.title}
					top={TIP_TOP}
				/>
			) : null}
		</Surface>
	);
}

function Score({ card }: { card: Extract<Card, { lit: true }> }) {
	const subtle = useTokenColor("subtle");
	const trend = card.trend?.kind === "shown" ? card.trend.text : null;
	return (
		<View
			accessibilityLabel={COPY.steadiness.label(card.score, trend)}
			accessible
			className="min-w-0 flex-1 gap-0.75"
		>
			<View className="flex-row items-baseline gap-0.75">
				<AppText
					className="text-[34px] tabular-nums leading-[34px] tracking-[-1px]"
					variant="display"
					weight="bold"
				>
					{card.score}
				</AppText>
				<AppText className="text-[13px]" color="subtle" variant="footnote">
					{COPY.steadiness.outOf}
				</AppText>
			</View>
			{card.trend?.kind === "shown" ? (
				<AppText
					className="text-[12.5px] leading-4"
					color="accent"
					variant="footnote"
					weight="semibold"
				>
					{card.trend.text}
				</AppText>
			) : null}
			{card.trend?.kind === "locked" ? (
				<View className="flex-row items-center gap-1">
					<Icon
						color={subtle}
						name={{ android: "lock", ios: "lock.fill" }}
						size={11}
					/>
					<AppText
						className="text-[12.5px] leading-4"
						color="subtle"
						variant="footnote"
						weight="medium"
					>
						{COPY.steadiness.lockedTrend}
					</AppText>
				</View>
			) : null}
		</View>
	);
}

function NotLit({ known }: { known: number }) {
	return (
		<View
			accessibilityLabel={COPY.steadiness.notLitLabel(known)}
			accessible
			className="min-w-0 flex-1 gap-0.75"
		>
			<AppText className="text-[15px]" variant="callout" weight="semibold">
				{COPY.steadiness.notLit}
			</AppText>
			<AppText
				className="text-[14px] leading-[19.5px]"
				color="muted"
				variant="callout"
			>
				{COPY.steadiness.notLitLine(known)}
			</AppText>
		</View>
	);
}
