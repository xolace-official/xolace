import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "@/features/you/copy";
import type { Noticed } from "@/features/you/steadiness/steadiness-model";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

const S = COPY.steadinessScreen;
const FLAME = { android: "local_fire_department", ios: "flame.fill" } as const;
const CHEVRON = { android: "chevron_right", ios: "chevron.right" } as const;

export function NoticedList({
	items,
	className,
}: {
	items: Noticed[];
	className?: string;
}) {
	if (items.length === 0) {
		return null;
	}
	return (
		<View
			className={cn(
				"gap-4 self-stretch border-separator border-t-[0.5px] pt-3.5",
				className
			)}
		>
			{items.map((n) => (
				<View className="gap-1" key={`${n.eyebrow}:${n.text}`}>
					<AppText
						className="text-[12px] leading-4"
						color="subtle"
						variant="caption"
					>
						{n.eyebrow}
					</AppText>
					<AppText className="text-[15px] leading-[22.5px]" variant="body">
						{n.text}
					</AppText>
					<AppText
						className="text-[11px] leading-[15px]"
						color="subtle"
						variant="caption"
					>
						{n.date}
					</AppText>
				</View>
			))}
		</View>
	);
}

export function KindlingRow({ onPress }: { onPress: () => void }) {
	const ember = useTokenColor("ember");
	const subtle = useTokenColor("subtle");
	return (
		<PressScale
			accessibilityLabel={S.kindlingLabel}
			accessibilityRole="button"
			className="flex-row items-center gap-3 rounded-[16px] bg-surface-secondary px-4 py-3"
			haptic={playSoftPress}
			onPress={onPress}
			scaleTo={0.98}
		>
			<Icon color={ember} name={FLAME} size={16} />
			<View className="flex-1 gap-px">
				<AppText className="text-[14px] leading-[19px]" variant="callout">
					{S.kindling}
				</AppText>
				<AppText
					className="text-[12px] leading-4"
					color="subtle"
					variant="caption"
				>
					{S.kindlingSub}
				</AppText>
			</View>
			<Icon color={subtle} name={CHEVRON} size={12} weight="semibold" />
		</PressScale>
	);
}
