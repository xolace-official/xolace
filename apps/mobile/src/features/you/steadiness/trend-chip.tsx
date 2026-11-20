import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "@/features/you/copy";
import {
	type Trend,
	trendSay,
	trendText,
} from "@/features/you/steadiness/steadiness-model";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

const UP = { android: "arrow_upward", ios: "arrow.up" } as const;
const DOWN = { android: "arrow_downward", ios: "arrow.down" } as const;
const LOCK = { android: "lock", ios: "lock.fill" } as const;

export function TrendChip({
	trend,
	now,
	short = false,
	arrow = false,
}: {
	trend: Trend;
	now: Date;
	short?: boolean;
	arrow?: boolean;
}) {
	const up = useTokenColor("success-ink");
	const down = useTokenColor("ember");
	const { delta } = trend;
	const tone =
		delta > 0
			? { bg: "bg-success-wash", fg: "text-success-ink" }
			: delta < 0
				? { bg: "bg-ember-wash", fg: "text-ember" }
				: { bg: "bg-surface-secondary", fg: "text-muted" };
	return (
		<View
			accessibilityLabel={trendSay(trend, now)}
			accessible
			className={cn(
				"flex-row items-center gap-1.25 rounded-full",
				short ? "h-6 px-2" : "h-7 px-2.5",
				tone.bg
			)}
		>
			{delta !== 0 && arrow ? (
				<Icon
					color={delta > 0 ? up : down}
					name={delta > 0 ? UP : DOWN}
					size={11}
					weight="bold"
				/>
			) : null}
			<AppText
				className={cn(
					"leading-4",
					short ? "text-[12px]" : "text-[13px]",
					tone.fg
				)}
				variant="footnote"
				weight="semibold"
			>
				{trendText(trend, now, short)}
			</AppText>
		</View>
	);
}

export function LockedTrendChip({ onPress }: { onPress: () => void }) {
	const accent = useTokenColor("accent");
	return (
		<PressScale
			accessibilityLabel={COPY.steadinessScreen.lockedLabel}
			accessibilityRole="button"
			className="h-7 flex-row items-center gap-1.25 rounded-full bg-surface-secondary px-2.5"
			haptic={playSoftPress}
			onPress={onPress}
		>
			<Icon color={accent} name={LOCK} size={11} />
			<AppText
				className="text-[13px] leading-4"
				variant="footnote"
				weight="semibold"
			>
				{COPY.steadinessScreen.locked}
			</AppText>
		</PressScale>
	);
}
