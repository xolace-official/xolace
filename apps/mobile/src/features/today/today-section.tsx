import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";

type Props = {
	title: string;
	action?: string;
	actionLabel?: string;
	onAction?: () => void;
};

const HIT = 10;

export function TodaySection({ title, action, actionLabel, onAction }: Props) {
	return (
		<View className="flex-row items-baseline justify-between gap-3 px-1">
			<AppText accessibilityRole="header" className="shrink" variant="headline">
				{title}
			</AppText>
			{action ? (
				<PressScale
					accessibilityLabel={actionLabel ?? action}
					accessibilityRole="link"
					hitSlop={HIT}
					onPress={onAction}
				>
					<AppText color="accentInk" variant="callout" weight="medium">
						{action}
					</AppText>
				</PressScale>
			) : null}
		</View>
	);
}
