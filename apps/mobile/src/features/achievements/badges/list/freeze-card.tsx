import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Card } from "@/components/shared/card";
import { PressScale } from "@/components/shared/press-scale";
import { useBadgesScreen } from "@/features/achievements/badges/badges-data";
import { COPY } from "@/features/achievements/copy";
import { cn } from "@/lib/cn";

export function FreezeCard() {
	const { state, actions } = useBadgesScreen();
	const { freeze, buying } = state;
	if (!freeze) {
		return null;
	}
	const off = freeze.reason !== null || buying;
	return (
		<Card
			className="mx-5 mt-7 flex-row items-center gap-3 px-4 py-3.5"
			flat
			radius={22}
		>
			<View className="flex-1 gap-0.5">
				<AppText variant="subhead" weight="semibold">
					{COPY.freeze.title}
				</AppText>
				<AppText
					accessibilityLiveRegion="polite"
					color="muted"
					variant="footnote"
				>
					{freeze.line}
				</AppText>
			</View>
			<PressScale
				accessibilityHint={freeze.reason ?? undefined}
				accessibilityState={{ busy: buying, disabled: off }}
				className={cn(
					"h-9.5 items-center justify-center rounded-[19px] px-3.5",
					off ? "bg-surface-secondary opacity-60" : "bg-accent"
				)}
				onPress={actions.buyFreeze}
			>
				<AppText
					className="text-[14px]"
					color={off ? "subtle" : "accentForeground"}
					variant="callout"
					weight="semibold"
				>
					{freeze.buy}
				</AppText>
			</PressScale>
		</Card>
	);
}
