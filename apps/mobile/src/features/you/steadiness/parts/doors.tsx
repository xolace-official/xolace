import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "@/features/you/copy";
import { DOMAIN_ICON } from "@/features/you/steadiness/parts/domain-icon";
import type { Domain } from "@/features/you/steadiness/steadiness-model";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

const S = COPY.steadinessScreen;
const LOCK = { android: "lock", ios: "lock.fill" } as const;

/** Free: production's "Unlock numbers" pill. */
export function UnlockNumbers({ onPress }: { onPress: () => void }) {
	const accent = useTokenColor("accent");
	return (
		<PressScale
			accessibilityRole="button"
			className="h-8.5 flex-row items-center gap-1.75 self-start rounded-[17px] bg-surface-secondary px-3.25"
			haptic={playSoftPress}
			onPress={onPress}
		>
			<Icon color={accent} name={LOCK} size={12} />
			<AppText
				className="text-[14px] leading-[18px]"
				variant="callout"
				weight="semibold"
			>
				{S.unlock}
			</AppText>
		</PressScale>
	);
}

/**
 * Free: production's CompoundingUpsellLine, glass with an amber tint: a part has been heavier
 * than usual, with no number. `onPlaced` gives the screen its place, so it's spent once seen.
 */
export function UpsellLine({
	domain,
	onPress,
	onPlaced,
}: {
	domain: Domain;
	onPress: () => void;
	onPlaced: (y: number, height: number) => void;
}) {
	const ember = useTokenColor("ember");
	const name = COPY.steadiness.domains[domain];
	return (
		<View
			onLayout={(e) =>
				onPlaced(e.nativeEvent.layout.y, e.nativeEvent.layout.height)
			}
		>
			<PressScale
				accessibilityLabel={S.upsellLabel(name)}
				accessibilityRole="button"
				className="flex-row items-center gap-3 overflow-hidden rounded-[24px] border-[0.5px] border-continuous border-ember/40 bg-glass px-4 py-3"
				haptic={playSoftPress}
				onPress={onPress}
				scaleTo={0.98}
			>
				<View className="absolute inset-0 bg-ember/10" />
				<View className="size-9 items-center justify-center rounded-[12px] bg-ember-wash">
					<Icon color={ember} name={DOMAIN_ICON[domain]} size={17} />
				</View>
				<View className="flex-1 gap-0.5">
					<AppText className="text-[14px] leading-[19.6px]" variant="callout">
						{S.upsell(name)}
					</AppText>
					<AppText
						className="text-[13px] text-ember leading-[17px]"
						variant="footnote"
						weight="bold"
					>
						{S.upsellGo}
					</AppText>
				</View>
			</PressScale>
		</View>
	);
}
