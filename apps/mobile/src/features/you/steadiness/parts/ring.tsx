import { View } from "react-native";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { SteadinessRing } from "@/components/shared/steadiness-ring";
import { COPY } from "@/features/you/copy";
import { DOMAIN_ICON } from "@/features/you/steadiness/parts/domain-icon";
import type { PartView } from "@/features/you/steadiness/steadiness-model";

const SIZE = 86;
const STROKE = 7;
export const RING_DELAY_MS = 500;
export const RING_STAGGER_MS = 40;
export const RING_FILL_MS = 900;

const easeOutCubic = (x: number) => {
	"worklet";
	return 1 - (1 - x) ** 3;
};

export function Ring({
	part,
	clock,
	index,
}: {
	part: PartView;
	clock: SharedValue<number>;
	index: number;
}) {
	const delay = RING_DELAY_MS + index * RING_STAGGER_MS;
	const fill = useDerivedValue(() =>
		easeOutCubic(Math.min(1, Math.max(0, (clock.get() - delay) / RING_FILL_MS)))
	);
	return (
		<SteadinessRing
			dashed={part.warming}
			fill={fill}
			icon={DOMAIN_ICON[part.domain]}
			size={SIZE}
			stroke={STROKE}
			tone={part.tone === "muted" ? "subtle" : part.tone}
			usual={part.usual}
			value={part.value}
		>
			<View className="absolute inset-0 items-center justify-center pb-1">
				{part.value === null ? (
					<AppText
						className="px-3 text-center text-[10px] leading-[12.5px]"
						color="subtle"
						numberOfLines={2}
						variant="caption"
					>
						{part.word}
					</AppText>
				) : (
					<>
						<AppText
							className="font-display-bold text-[22px] tabular-nums leading-[26px]"
							variant="display"
						>
							{part.value}
						</AppText>
						<AppText
							className="-mt-0.5 text-[9px] leading-[11px]"
							color="subtle"
							variant="caption"
						>
							{COPY.steadiness.outOf}
						</AppText>
					</>
				)}
			</View>
		</SteadinessRing>
	);
}
