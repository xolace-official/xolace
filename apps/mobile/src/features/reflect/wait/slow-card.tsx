import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { GlassButton } from "@/components/shared/glass-button";

const PILL = 40;

export type CardAction = { label: string; go: () => void };

function Pill({ action, primary }: { action: CardAction; primary: boolean }) {
	return (
		<GlassButton
			accessibilityLabel={action.label}
			accessibilityRole="button"
			className="justify-center rounded-full px-4"
			fill={primary ? "foreground" : "secondary"}
			onPress={action.go}
			style={{ height: PILL }}
		>
			<AppText
				className="text-[14px]"
				color={primary ? "background" : "foreground"}
				variant="callout"
				weight="semibold"
			>
				{action.label}
			</AppText>
		</GlassButton>
	);
}

export function SlowCard({
	body,
	primary,
	secondary,
}: {
	body: string;
	primary: CardAction;
	secondary?: CardAction;
}) {
	return (
		<View
			accessibilityLiveRegion="polite"
			className="gap-2.5 rounded-[22px] border border-continuous border-separator bg-surface px-4.5 py-4"
		>
			<AppText
				className="text-[14.5px] leading-[21px]"
				color="muted"
				variant="callout"
			>
				{body}
			</AppText>
			<View className="flex-row gap-2">
				<Pill action={primary} primary />
				{secondary ? <Pill action={secondary} primary={false} /> : null}
			</View>
		</View>
	);
}
